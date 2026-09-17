import { query, queryOne, transaction } from "@/lib/db/client";
import type {
  EnquiryStatus,
  PropertyFilters,
  RoomType,
  SortKey,
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
  createdAt: Date;
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
  created_at: Date;
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
    createdAt: row.created_at,
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
  room_type, description, amenities, image_url, created_at
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
): { clause: string; params: unknown[] } {
  const conditions: string[] = [];
  const params: unknown[] = [];
  let i = startIndex;

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
    `SELECT ${PROPERTY_COLUMNS} FROM properties WHERE slug = $1`,
    [slug],
  );
  return row ? toProperty(row) : null;
}

export async function propertyExists(id: number): Promise<boolean> {
  const row = await queryOne<{ exists: boolean }>(
    "SELECT true AS exists FROM properties WHERE id = $1",
    [id],
  );
  return row !== null;
}

/** Distinct values for the filter dropdowns, plus the real price bounds. */
export async function getFilterOptions(): Promise<FilterOptions> {
  const [cities, universities, roomTypes, range] = await Promise.all([
    query<{ city: string }>("SELECT DISTINCT city FROM properties ORDER BY city"),
    query<{ university: string }>(
      "SELECT DISTINCT university FROM properties ORDER BY university",
    ),
    query<{ room_type: RoomType }>(
      "SELECT DISTINCT room_type FROM properties ORDER BY room_type",
    ),
    queryOne<{ min: number; max: number }>(
      `SELECT coalesce(min(price_per_week), 0) AS min,
              coalesce(max(price_per_week), 0) AS max
         FROM properties`,
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
      WHERE s.student_id = $1
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
