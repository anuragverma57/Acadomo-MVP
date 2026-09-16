import {
  getFilterOptions,
  getPropertyBySlug,
  listProperties,
  type FilterOptions,
  type Property,
  type PropertyPage,
} from "@/lib/db/queries";
import type { PropertyFilters } from "@/lib/validation";

/**
 * Property read operations. Thin today — the listing rules live in SQL, which
 * is where they belong — but this is the seam that keeps route handlers free
 * of data access (CLAUDE.md §2a).
 */

export async function searchProperties(
  filters: PropertyFilters,
): Promise<PropertyPage> {
  return listProperties(filters);
}

export async function findPropertyBySlug(slug: string): Promise<Property | null> {
  return getPropertyBySlug(slug);
}

export async function loadFilterOptions(): Promise<FilterOptions> {
  return getFilterOptions();
}
