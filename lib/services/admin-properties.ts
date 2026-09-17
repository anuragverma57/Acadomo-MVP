import {
  createProperty,
  getAdminPropertyCities,
  searchAdminProperties,
  type AdminPropertyPage,
  getPropertyById,
  listAllProperties,
  setPropertyActive,
  slugTaken,
  updateProperty,
  type Property,
} from "@/lib/db/queries";
import type {
  AdminPropertyFilters,
  PropertyInputValues,
} from "@/lib/validation";

/**
 * Admin property management. Services take plain values and return plain data —
 * no Request/Response (CLAUDE.md §2a).
 */

/** "Iona House" + "London" -> "iona-house-london" */
function slugify(title: string, city: string): string {
  return `${title} ${city}`
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 120);
}

/**
 * Slugs are derived server-side, never accepted from the client, and made
 * unique by suffixing. A client-supplied slug could collide or be crafted to
 * shadow an existing listing.
 */
async function uniqueSlug(
  title: string,
  city: string,
  excludeId?: number,
): Promise<string> {
  const base = slugify(title, city) || "property";
  let candidate = base;

  for (let n = 2; await slugTaken(candidate, excludeId); n += 1) {
    candidate = `${base}-${n}`;
    if (n > 50) {
      candidate = `${base}-${Date.now()}`;
      break;
    }
  }

  return candidate;
}

export async function getAllProperties(): Promise<Property[]> {
  return listAllProperties();
}

export async function findAdminProperties(
  filters: AdminPropertyFilters,
): Promise<AdminPropertyPage> {
  return searchAdminProperties(filters);
}

export async function loadAdminPropertyCities(): Promise<string[]> {
  return getAdminPropertyCities();
}

export async function findPropertyById(id: number): Promise<Property | null> {
  return getPropertyById(id);
}

export async function addProperty(
  input: PropertyInputValues,
): Promise<Property> {
  const slug = await uniqueSlug(input.title, input.city);
  return createProperty({ ...input, slug });
}

export async function editProperty(
  id: number,
  input: PropertyInputValues,
): Promise<Property | null> {
  const existing = await getPropertyById(id);
  if (!existing) return null;

  // Re-derive the slug so a renamed property gets a matching URL, while
  // excluding itself from the uniqueness check.
  const slug = await uniqueSlug(input.title, input.city, id);
  return updateProperty(id, { ...input, slug });
}

export async function toggleProperty(
  id: number,
  isActive: boolean,
): Promise<Property | null> {
  return setPropertyActive(id, isActive);
}
