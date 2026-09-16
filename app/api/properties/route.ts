import { badRequest, ok, serverError, validationFailed } from "@/lib/api";
import { loadFilterOptions, searchProperties } from "@/lib/services/properties";
import { propertyFiltersSchema } from "@/lib/validation";

/**
 * GET /api/properties
 * Server-side search, filtering, sorting and pagination.
 * Query: q, city, university, roomType, minPrice, maxPrice, sort, page, pageSize
 * Pass ?options=1 to also receive the filter dropdown values.
 */
export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const parsed = propertyFiltersSchema.safeParse(
      Object.fromEntries(searchParams),
    );

    if (!parsed.success) {
      return validationFailed(parsed.error);
    }

    const page = await searchProperties(parsed.data);

    if (searchParams.get("options") === "1") {
      return ok({ ...page, options: await loadFilterOptions() });
    }

    return ok(page);
  } catch (error) {
    if (error instanceof TypeError) return badRequest("Malformed request URL");
    return serverError("GET /api/properties", error);
  }
}
