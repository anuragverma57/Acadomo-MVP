import { query, queryOne, transaction } from "@/lib/db/client";
import type {
  AdminPropertyFilters,
  AdminPropertySortKey,
  DateRange,
  EnquiryFilters,
  EnquirySortKey,
  EnquiryStatus,
  PropertyFilters,
  RoomType,
  SortKey,
  VisibilityFilter,
} from "@/lib/validation";

/**
 * Every SQL statement in the application lives in this module (CLAUDE.md §2a).
 * Rules:
 *   - values are ALWAYS passed as $1, $2… parameters, never interpolated
 *   - identifiers (columns, directions) come from allowlists, never from input
 *   - snake_case -> camelCase mapping happens here, so nothing above this layer
 *     ever sees database naming
 */

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export type Property = {
  id: number;
  title: string;
  slug: string;
  city: string;
  country: string;
  university: string;
  pricePerWeek: number;
  currency: string;
  roomType: RoomType;
  description: string;
  amenities: string[];
  imageUrl: string;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
};

export type Enquiry = {
  id: number;
  propertyId: number;
  studentId: number | null;
  name: string;
  email: string;
  phone: string;
  message: string;
  status: EnquiryStatus;
  createdAt: Date;
  propertyTitle: string;
  propertySlug: string;
};

export type PropertyPage = {
  items: Property[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
};

export type FilterOptions = {
  cities: string[];
  universities: string[];
  roomTypes: RoomType[];
  priceRange: { min: number; max: number };
};

type PropertyRow = {
  id: number;
  title: string;
  slug: string;
  city: string;
  country: string;
  university: string;
  price_per_week: number;
  currency: string;
  room_type: RoomType;
  description: string;
  amenities: string[];
  image_url: string;
  is_active: boolean;
  created_at: Date;
  updated_at: Date;
};

type EnquiryRow = {
  id: number;
  property_id: number;
  student_id: number | null;
  name: string;
  email: string;
  phone: string;
  message: string;
  status: EnquiryStatus;
  created_at: Date;
  property_title: string;
  property_slug: string;
};

function toProperty(row: PropertyRow): Property {
  return {
    id: row.id,
    title: row.title,
    slug: row.slug,
    city: row.city,
    country: row.country,
    university: row.university,
    pricePerWeek: row.price_per_week,
    currency: row.currency,
    roomType: row.room_type,
    description: row.description,
    amenities: row.amenities,
    imageUrl: row.image_url,
    isActive: row.is_active,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

function toEnquiry(row: EnquiryRow): Enquiry {
  return {
    id: row.id,
    propertyId: row.property_id,
    studentId: row.student_id,
    name: row.name,
    email: row.email,
    phone: row.phone,
    message: row.message,
    status: row.status,
    createdAt: row.created_at,
    propertyTitle: row.property_title,
    propertySlug: row.property_slug,
  };
}

// ---------------------------------------------------------------------------
// Properties
// ---------------------------------------------------------------------------

const PROPERTY_COLUMNS = `
  id, title, slug, city, country, university, price_per_week, currency,
  room_type, description, amenities, image_url, is_active, created_at, updated_at
`;

/**
 * Maps a sort key to a SQL fragment. This indirection is the security boundary
 * for ORDER BY: a column name cannot be parameterized, so user input must never
 * reach it. An unknown key falls back to the default rather than erroring.
 */
const SORT_SQL: Record<SortKey, string> = {
  newest: "created_at DESC, id DESC",
  price_asc: "price_per_week ASC, id DESC",
  price_desc: "price_per_week DESC, id DESC",
};

/**
 * Builds the shared WHERE clause for listing and counting. Returns the SQL
 * fragment plus its parameter values, so both queries stay in lockstep.
 *
 * Exported for unit testing (Phase 6): the tests assert that no filter value
 * can reach the SQL string itself.
 */
export function buildPropertyWhere(
  filters: Partial<PropertyFilters>,
  startIndex = 1,
  options: { includeInactive?: boolean } = {},
): { clause: string; params: unknown[] } {
  const conditions: string[] = [];
  const params: unknown[] = [];
  let i = startIndex;

  // Visibility is enforced HERE, in SQL — never by the UI omitting a row.
  // Only admin queries may opt out.
  if (!options.includeInactive) {
    conditions.push("is_active = true");
  }

  if (filters.q) {
    // Single placeholder used three times — one param, three columns searched.
    conditions.push(
      `(title ILIKE '%' || $${i} || '%' OR city ILIKE '%' || $${i} || '%' OR university ILIKE '%' || $${i} || '%')`,
    );
    params.push(filters.q);
    i += 1;
  }

  if (filters.city) {
    conditions.push(`city = $${i}`);
    params.push(filters.city);
    i += 1;
  }

  if (filters.university) {
    conditions.push(`university = $${i}`);
    params.push(filters.university);
    i += 1;
  }

  if (filters.roomType) {
    conditions.push(`room_type = $${i}`);
    params.push(filters.roomType);
    i += 1;
  }

  if (filters.minPrice !== undefined) {
    conditions.push(`price_per_week >= $${i}`);
    params.push(filters.minPrice);
    i += 1;
  }

  if (filters.maxPrice !== undefined) {
    conditions.push(`price_per_week <= $${i}`);
    params.push(filters.maxPrice);
    i += 1;
  }

  return {
    clause: conditions.length ? `WHERE ${conditions.join(" AND ")}` : "",
    params,
  };
}

/**
 * Server-side filtered, sorted and paginated property listing.
 * Filtering happens in SQL — never by fetching all rows and filtering in JS.
 */
export async function listProperties(
  filters: PropertyFilters,
): Promise<PropertyPage> {
  const { clause, params } = buildPropertyWhere(filters);
  const orderBy = SORT_SQL[filters.sort] ?? SORT_SQL.newest;
  const offset = (filters.page - 1) * filters.pageSize;

  const limitIndex = params.length + 1;
  const offsetIndex = params.length + 2;

  const [rows, countRow] = await Promise.all([
    query<PropertyRow>(
      `SELECT ${PROPERTY_COLUMNS}
         FROM properties
         ${clause}
        ORDER BY ${orderBy}
        LIMIT $${limitIndex} OFFSET $${offsetIndex}`,
      [...params, filters.pageSize, offset],
    ),
    queryOne<{ count: number }>(
      `SELECT count(*)::int AS count FROM properties ${clause}`,
      params,
    ),
  ]);

  const total = countRow?.count ?? 0;

  return {
    items: rows.map(toProperty),
    total,
    page: filters.page,
    pageSize: filters.pageSize,
    totalPages: Math.max(1, Math.ceil(total / filters.pageSize)),
  };
}

export async function getPropertyBySlug(slug: string): Promise<Property | null> {
  const row = await queryOne<PropertyRow>(
    `SELECT ${PROPERTY_COLUMNS} FROM properties WHERE slug = $1 AND is_active = true`,
    [slug],
  );
  return row ? toProperty(row) : null;
}

export async function propertyExists(id: number): Promise<boolean> {
  const row = await queryOne<{ exists: boolean }>(
    "SELECT true AS exists FROM properties WHERE id = $1 AND is_active = true",
    [id],
  );
  return row !== null;
}

/** Distinct values for the filter dropdowns, plus the real price bounds. */
export async function getFilterOptions(): Promise<FilterOptions> {
  const [cities, universities, roomTypes, range] = await Promise.all([
    query<{ city: string }>("SELECT DISTINCT city FROM properties WHERE is_active = true ORDER BY city"),
    query<{ university: string }>(
      "SELECT DISTINCT university FROM properties WHERE is_active = true ORDER BY university",
    ),
    query<{ room_type: RoomType }>(
      "SELECT DISTINCT room_type FROM properties WHERE is_active = true ORDER BY room_type",
    ),
    queryOne<{ min: number; max: number }>(
      `SELECT coalesce(min(price_per_week), 0) AS min,
              coalesce(max(price_per_week), 0) AS max
         FROM properties WHERE is_active = true`,
    ),
  ]);

  return {
    cities: cities.map((r) => r.city),
    universities: universities.map((r) => r.university),
    roomTypes: roomTypes.map((r) => r.room_type),
    priceRange: { min: range?.min ?? 0, max: range?.max ?? 0 },
  };
}

// ---------------------------------------------------------------------------
// Enquiries
// ---------------------------------------------------------------------------

export async function createEnquiry(input: {
  propertyId: number;
  studentId?: number | null;
  name: string;
  email: string;
  phone: string;
  message: string;
}): Promise<{ id: number }> {
  const row = await queryOne<{ id: number }>(
    `INSERT INTO enquiries (property_id, student_id, name, email, phone, message)
     VALUES ($1, $2, $3, $4, $5, $6)
     RETURNING id`,
    [
      input.propertyId,
      input.studentId ?? null,
      input.name,
      input.email,
      input.phone,
      input.message,
    ],
  );

  if (!row) {
    throw new Error("Enquiry insert returned no row");
  }
  return row;
}

const ENQUIRY_SELECT = `
  SELECT e.id, e.property_id, e.student_id, e.name, e.email, e.phone,
         e.message, e.status, e.created_at,
         p.title AS property_title, p.slug AS property_slug
    FROM enquiries e
    JOIN properties p ON p.id = e.property_id
`;

export async function listEnquiries(
  status?: EnquiryStatus,
): Promise<Enquiry[]> {
  const rows = status
    ? await query<EnquiryRow>(
        `${ENQUIRY_SELECT} WHERE e.status = $1 ORDER BY e.created_at DESC`,
        [status],
      )
    : await query<EnquiryRow>(`${ENQUIRY_SELECT} ORDER BY e.created_at DESC`);

  return rows.map(toEnquiry);
}

export async function updateEnquiryStatus(
  id: number,
  status: EnquiryStatus,
): Promise<Enquiry | null> {
  const updated = await queryOne<{ id: number }>(
    "UPDATE enquiries SET status = $2 WHERE id = $1 RETURNING id",
    [id, status],
  );

  if (!updated) return null;

  const row = await queryOne<EnquiryRow>(`${ENQUIRY_SELECT} WHERE e.id = $1`, [id]);
  return row ? toEnquiry(row) : null;
}

export async function countEnquiriesByStatus(): Promise<
  Record<EnquiryStatus | "all", number>
> {
  const rows = await query<{ status: EnquiryStatus; count: number }>(
    "SELECT status, count(*)::int AS count FROM enquiries GROUP BY status",
  );

  const counts = { all: 0, new: 0, contacted: 0 };
  for (const row of rows) {
    counts[row.status] = row.count;
    counts.all += row.count;
  }
  return counts;
}

// ---------------------------------------------------------------------------
// Admin users
// ---------------------------------------------------------------------------

export type AdminUser = {
  id: number;
  email: string;
  passwordHash: string;
  role: string;
};

/**
 * Selects the password hash — the ONLY query that may. Call this solely from
 * the authentication path, never to display a user (CLAUDE.md §3).
 */
export async function findAdminByEmail(email: string): Promise<AdminUser | null> {
  const row = await queryOne<{
    id: number;
    email: string;
    password_hash: string;
    role: string;
  }>(
    "SELECT id, email, password_hash, role FROM admin_users WHERE email = $1",
    [email],
  );

  if (!row) return null;

  return {
    id: row.id,
    email: row.email,
    passwordHash: row.password_hash,
    role: row.role,
  };
}

// ---------------------------------------------------------------------------
// Students & OTP
// ---------------------------------------------------------------------------

export type Student = {
  id: number;
  email: string;
  name: string | null;
  emailVerifiedAt: Date | null;
};

export type OtpRecord = {
  id: number;
  codeHash: string;
  attempts: number;
};

/**
 * Invalidates any live codes for this email, then stores the new one.
 * Both statements run in one transaction so a request can never leave two
 * usable codes behind.
 */
export async function createOtpCode(
  email: string,
  codeHash: string,
  expiresAt: Date,
): Promise<void> {
  await transaction(async (client) => {
    await client.query(
      "UPDATE otp_codes SET consumed_at = now() WHERE email = $1 AND consumed_at IS NULL",
      [email],
    );
    await client.query(
      "INSERT INTO otp_codes (email, code_hash, expires_at) VALUES ($1, $2, $3)",
      [email, codeHash, expiresAt],
    );
  });
}

/**
 * Newest live code for an email. Expiry is enforced here in SQL rather than
 * compared in JS, so a clock difference in the app cannot extend a code's life.
 */
export async function findLiveOtp(email: string): Promise<OtpRecord | null> {
  const row = await queryOne<{ id: number; code_hash: string; attempts: number }>(
    `SELECT id, code_hash, attempts
       FROM otp_codes
      WHERE email = $1
        AND consumed_at IS NULL
        AND expires_at > now()
      ORDER BY created_at DESC
      LIMIT 1`,
    [email],
  );

  return row
    ? { id: row.id, codeHash: row.code_hash, attempts: row.attempts }
    : null;
}

export async function incrementOtpAttempts(id: number): Promise<number> {
  const row = await queryOne<{ attempts: number }>(
    "UPDATE otp_codes SET attempts = attempts + 1 WHERE id = $1 RETURNING attempts",
    [id],
  );
  return row?.attempts ?? 0;
}

export async function burnOtp(id: number): Promise<void> {
  await query("UPDATE otp_codes SET consumed_at = now() WHERE id = $1", [id]);
}

/**
 * Consumes the code and upserts the student in one transaction, so a verified
 * code can never be spent without producing a session-ready student row.
 *
 * The UPDATE is conditional on consumed_at IS NULL, so two concurrent requests
 * with the same code cannot both succeed.
 */
export async function consumeOtpAndUpsertStudent(
  otpId: number,
  email: string,
): Promise<Student | null> {
  return transaction(async (client) => {
    const consumed = await client.query(
      "UPDATE otp_codes SET consumed_at = now() WHERE id = $1 AND consumed_at IS NULL RETURNING id",
      [otpId],
    );

    if (consumed.rowCount === 0) {
      return null; // Already used by a concurrent request.
    }

    const result = await client.query<{
      id: number;
      email: string;
      name: string | null;
      email_verified_at: Date | null;
    }>(
      `INSERT INTO students (email, email_verified_at)
       VALUES ($1, now())
       ON CONFLICT (email)
       DO UPDATE SET email_verified_at = now()
       RETURNING id, email, name, email_verified_at`,
      [email],
    );

    const row = result.rows[0]!;
    return {
      id: row.id,
      email: row.email,
      name: row.name,
      emailVerifiedAt: row.email_verified_at,
    };
  });
}

export async function updateStudentName(
  studentId: number,
  name: string,
): Promise<void> {
  await query("UPDATE students SET name = $2 WHERE id = $1", [studentId, name]);
}

export async function getStudentById(id: number): Promise<Student | null> {
  const row = await queryOne<{
    id: number;
    email: string;
    name: string | null;
    email_verified_at: Date | null;
  }>("SELECT id, email, name, email_verified_at FROM students WHERE id = $1", [id]);

  return row
    ? {
        id: row.id,
        email: row.email,
        name: row.name,
        emailVerifiedAt: row.email_verified_at,
      }
    : null;
}

// ---------------------------------------------------------------------------
// Saved properties
// ---------------------------------------------------------------------------

/** Idempotent: the composite primary key absorbs a repeat save. */
export async function saveProperty(
  studentId: number,
  propertyId: number,
): Promise<void> {
  await query(
    `INSERT INTO saved_properties (student_id, property_id)
     VALUES ($1, $2)
     ON CONFLICT (student_id, property_id) DO NOTHING`,
    [studentId, propertyId],
  );
}

export async function unsaveProperty(
  studentId: number,
  propertyId: number,
): Promise<void> {
  await query(
    "DELETE FROM saved_properties WHERE student_id = $1 AND property_id = $2",
    [studentId, propertyId],
  );
}

/** Scoped by student_id in SQL — never by a client-supplied identifier. */
export async function listSavedProperties(
  studentId: number,
): Promise<Property[]> {
  // Columns must be table-qualified: properties and saved_properties both
  // have created_at, so the unqualified list is ambiguous across this join.
  const rows = await query<PropertyRow>(
    `SELECT p.id, p.title, p.slug, p.city, p.country, p.university,
            p.price_per_week, p.currency, p.room_type, p.description,
            p.amenities, p.image_url, p.created_at
       FROM properties p
       JOIN saved_properties s ON s.property_id = p.id
      WHERE s.student_id = $1 AND p.is_active = true
      ORDER BY s.created_at DESC`,
    [studentId],
  );
  return rows.map(toProperty);
}

export async function listSavedPropertyIds(
  studentId: number,
): Promise<number[]> {
  const rows = await query<{ property_id: number }>(
    "SELECT property_id FROM saved_properties WHERE student_id = $1",
    [studentId],
  );
  return rows.map((r) => r.property_id);
}

// ---------------------------------------------------------------------------
// Student enquiries
// ---------------------------------------------------------------------------

/** Scoped by session student_id in SQL. */
export async function listEnquiriesForStudent(
  studentId: number,
): Promise<Enquiry[]> {
  const rows = await query<EnquiryRow>(
    `${ENQUIRY_SELECT} WHERE e.student_id = $1 ORDER BY e.created_at DESC`,
    [studentId],
  );
  return rows.map(toEnquiry);
}

/**
 * Whether an admin account exists for this email.
 *
 * Deliberately does NOT select password_hash — only the authentication path
 * may read that (see findAdminByEmail).
 */
export async function adminExists(email: string): Promise<boolean> {
  const row = await queryOne<{ exists: boolean }>(
    "SELECT true AS exists FROM admin_users WHERE email = $1",
    [email],
  );
  return row !== null;
}

// ---------------------------------------------------------------------------
// Admin: property management
// ---------------------------------------------------------------------------

export type PropertyInput = {
  title: string;
  city: string;
  country: string;
  university: string;
  pricePerWeek: number;
  roomType: RoomType;
  description: string;
  amenities: string[];
  imageUrl: string;
  isActive: boolean;
};

/** Admin listing — includes inactive rows, which public queries never return. */
export async function listAllProperties(): Promise<Property[]> {
  const rows = await query<PropertyRow>(
    `SELECT ${PROPERTY_COLUMNS} FROM properties ORDER BY created_at DESC`,
  );
  return rows.map(toProperty);
}

export async function getPropertyById(id: number): Promise<Property | null> {
  const row = await queryOne<PropertyRow>(
    `SELECT ${PROPERTY_COLUMNS} FROM properties WHERE id = $1`,
    [id],
  );
  return row ? toProperty(row) : null;
}

/** True when the slug is taken by a DIFFERENT property. */
export async function slugTaken(slug: string, excludeId?: number): Promise<boolean> {
  const row = excludeId
    ? await queryOne<{ id: number }>(
        "SELECT id FROM properties WHERE slug = $1 AND id <> $2",
        [slug, excludeId],
      )
    : await queryOne<{ id: number }>(
        "SELECT id FROM properties WHERE slug = $1",
        [slug],
      );
  return row !== null;
}

export async function createProperty(
  input: PropertyInput & { slug: string },
): Promise<Property> {
  const row = await queryOne<PropertyRow>(
    `INSERT INTO properties
       (title, slug, city, country, university, price_per_week, room_type,
        description, amenities, image_url, is_active)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
     RETURNING ${PROPERTY_COLUMNS}`,
    [
      input.title,
      input.slug,
      input.city,
      input.country,
      input.university,
      input.pricePerWeek,
      input.roomType,
      input.description,
      input.amenities,
      input.imageUrl,
      input.isActive,
    ],
  );

  if (!row) throw new Error("Property insert returned no row");
  return toProperty(row);
}

export async function updateProperty(
  id: number,
  input: PropertyInput & { slug: string },
): Promise<Property | null> {
  const row = await queryOne<PropertyRow>(
    `UPDATE properties
        SET title = $2, slug = $3, city = $4, country = $5, university = $6,
            price_per_week = $7, room_type = $8, description = $9,
            amenities = $10, image_url = $11, is_active = $12, updated_at = now()
      WHERE id = $1
      RETURNING ${PROPERTY_COLUMNS}`,
    [
      id,
      input.title,
      input.slug,
      input.city,
      input.country,
      input.university,
      input.pricePerWeek,
      input.roomType,
      input.description,
      input.amenities,
      input.imageUrl,
      input.isActive,
    ],
  );
  return row ? toProperty(row) : null;
}

export async function setPropertyActive(
  id: number,
  isActive: boolean,
): Promise<Property | null> {
  const row = await queryOne<PropertyRow>(
    `UPDATE properties SET is_active = $2, updated_at = now()
      WHERE id = $1 RETURNING ${PROPERTY_COLUMNS}`,
    [id, isActive],
  );
  return row ? toProperty(row) : null;
}

// ---------------------------------------------------------------------------
// Admin: enquiry search, filtering, sorting and pagination
// ---------------------------------------------------------------------------

export type EnquiryPage = {
  items: Enquiry[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
};

/** ORDER BY cannot be parameterized, so sort keys map through an allowlist. */
const ENQUIRY_SORT_SQL: Record<EnquirySortKey, string> = {
  newest: "e.created_at DESC, e.id DESC",
  oldest: "e.created_at ASC, e.id ASC",
  property: "p.title ASC, e.created_at DESC",
};

/** Date ranges are fixed windows, never raw user-supplied SQL intervals. */
const RANGE_DAYS: Record<DateRange, number | null> = {
  all: null,
  "7d": 7,
  "30d": 30,
  "90d": 90,
};

/**
 * Builds the shared WHERE clause for listing and counting enquiries.
 * Exported for unit testing — the tests assert no value reaches the SQL text.
 */
export function buildEnquiryWhere(
  filters: Partial<EnquiryFilters>,
  startIndex = 1,
): { clause: string; params: unknown[] } {
  const conditions: string[] = [];
  const params: unknown[] = [];
  let i = startIndex;

  if (filters.q) {
    conditions.push(
      `(e.name ILIKE '%' || $${i} || '%' OR e.email ILIKE '%' || $${i} || '%' ` +
        `OR e.message ILIKE '%' || $${i} || '%' OR p.title ILIKE '%' || $${i} || '%')`,
    );
    params.push(filters.q);
    i += 1;
  }

  if (filters.status) {
    conditions.push(`e.status = $${i}`);
    params.push(filters.status);
    i += 1;
  }

  const days = filters.range ? RANGE_DAYS[filters.range] : null;
  if (days !== null && days !== undefined) {
    // The interval is built from an allowlisted integer, not from input.
    conditions.push(`e.created_at >= now() - ($${i} || ' days')::interval`);
    params.push(days);
    i += 1;
  }

  return {
    clause: conditions.length ? `WHERE ${conditions.join(" AND ")}` : "",
    params,
  };
}

export async function searchEnquiries(
  filters: EnquiryFilters,
): Promise<EnquiryPage> {
  const { clause, params } = buildEnquiryWhere(filters);
  const orderBy = ENQUIRY_SORT_SQL[filters.sort] ?? ENQUIRY_SORT_SQL.newest;
  const offset = (filters.page - 1) * filters.pageSize;

  const [rows, countRow] = await Promise.all([
    query<EnquiryRow>(
      `${ENQUIRY_SELECT} ${clause}
        ORDER BY ${orderBy}
        LIMIT $${params.length + 1} OFFSET $${params.length + 2}`,
      [...params, filters.pageSize, offset],
    ),
    queryOne<{ count: number }>(
      `SELECT count(*)::int AS count
         FROM enquiries e
         JOIN properties p ON p.id = e.property_id
         ${clause}`,
      params,
    ),
  ]);

  const total = countRow?.count ?? 0;

  return {
    items: rows.map(toEnquiry),
    total,
    page: filters.page,
    pageSize: filters.pageSize,
    totalPages: Math.max(1, Math.ceil(total / filters.pageSize)),
  };
}

// ---------------------------------------------------------------------------
// Admin: property search, filtering, sorting and pagination
// ---------------------------------------------------------------------------

/** ORDER BY cannot be parameterized — sort keys map through an allowlist. */
const ADMIN_PROPERTY_SORT_SQL: Record<AdminPropertySortKey, string> = {
  newest: "created_at DESC, id DESC",
  oldest: "created_at ASC, id ASC",
  price_asc: "price_per_week ASC, id DESC",
  price_desc: "price_per_week DESC, id DESC",
  title: "title ASC, id DESC",
};

const VISIBILITY_SQL: Record<VisibilityFilter, string | null> = {
  all: null,
  active: "is_active = true",
  hidden: "is_active = false",
};

/**
 * WHERE clause for the admin property list. Unlike the public builder this can
 * return hidden rows — visibility is an explicit filter here, not a guard.
 *
 * Exported for unit testing.
 */
export function buildAdminPropertyWhere(
  filters: Partial<AdminPropertyFilters>,
  startIndex = 1,
): { clause: string; params: unknown[] } {
  const conditions: string[] = [];
  const params: unknown[] = [];
  let i = startIndex;

  if (filters.q) {
    conditions.push(
      `(title ILIKE '%' || $${i} || '%' OR city ILIKE '%' || $${i} || '%' ` +
        `OR university ILIKE '%' || $${i} || '%')`,
    );
    params.push(filters.q);
    i += 1;
  }

  if (filters.city) {
    conditions.push(`city = $${i}`);
    params.push(filters.city);
    i += 1;
  }

  if (filters.roomType) {
    conditions.push(`room_type = $${i}`);
    params.push(filters.roomType);
    i += 1;
  }

  const visibility = filters.visibility
    ? VISIBILITY_SQL[filters.visibility]
    : null;
  if (visibility) conditions.push(visibility);

  return {
    clause: conditions.length ? `WHERE ${conditions.join(" AND ")}` : "",
    params,
  };
}

export type AdminPropertyPage = {
  items: Property[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
  activeCount: number;
  hiddenCount: number;
};

export async function searchAdminProperties(
  filters: AdminPropertyFilters,
): Promise<AdminPropertyPage> {
  const { clause, params } = buildAdminPropertyWhere(filters);
  const orderBy =
    ADMIN_PROPERTY_SORT_SQL[filters.sort] ?? ADMIN_PROPERTY_SORT_SQL.newest;
  const offset = (filters.page - 1) * filters.pageSize;

  const [rows, countRow, totals] = await Promise.all([
    query<PropertyRow>(
      `SELECT ${PROPERTY_COLUMNS}
         FROM properties
         ${clause}
        ORDER BY ${orderBy}
        LIMIT $${params.length + 1} OFFSET $${params.length + 2}`,
      [...params, filters.pageSize, offset],
    ),
    queryOne<{ count: number }>(
      `SELECT count(*)::int AS count FROM properties ${clause}`,
      params,
    ),
    queryOne<{ active: number; hidden: number }>(
      `SELECT count(*) FILTER (WHERE is_active)::int      AS active,
              count(*) FILTER (WHERE NOT is_active)::int  AS hidden
         FROM properties`,
    ),
  ]);

  const total = countRow?.count ?? 0;

  return {
    items: rows.map(toProperty),
    total,
    page: filters.page,
    pageSize: filters.pageSize,
    totalPages: Math.max(1, Math.ceil(total / filters.pageSize)),
    activeCount: totals?.active ?? 0,
    hiddenCount: totals?.hidden ?? 0,
  };
}

/** Distinct cities across ALL properties, hidden included. */
export async function getAdminPropertyCities(): Promise<string[]> {
  const rows = await query<{ city: string }>(
    "SELECT DISTINCT city FROM properties ORDER BY city",
  );
  return rows.map((row) => row.city);
}
