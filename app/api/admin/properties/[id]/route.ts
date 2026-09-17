import {
  badRequest,
  notFound,
  ok,
  serverError,
  unauthorized,
  validationFailed,
} from "@/lib/api";
import { getAdminSession } from "@/lib/auth";
import { editProperty, toggleProperty } from "@/lib/services/admin-properties";
import { propertyActiveSchema, propertyInputSchema } from "@/lib/validation";

async function requireAdmin(params: Promise<{ id: string }>) {
  const session = await getAdminSession();
  if (!session) return { error: unauthorized() };

  const { id } = await params;
  const propertyId = Number(id);
  if (!Number.isInteger(propertyId) || propertyId < 1) {
    return { error: badRequest("Invalid property id") };
  }

  return { propertyId };
}

/** PATCH /api/admin/properties/[id] — full update, or just the active flag. */
export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const resolved = await requireAdmin(params);
    if (resolved.error) return resolved.error;

    const body = await request.json().catch(() => null);

    // A body of only { isActive } is the inline toggle; anything else is a
    // full edit and must satisfy the whole schema.
    const toggle = propertyActiveSchema.safeParse(body);
    if (toggle.success && Object.keys(body ?? {}).length === 1) {
      const updated = await toggleProperty(resolved.propertyId, toggle.data.isActive);
      return updated ? ok(updated) : notFound("Property not found");
    }

    const parsed = propertyInputSchema.safeParse(body);
    if (!parsed.success) return validationFailed(parsed.error);

    const updated = await editProperty(resolved.propertyId, parsed.data);
    return updated ? ok(updated) : notFound("Property not found");
  } catch (error) {
    return serverError("PATCH /api/admin/properties/[id]", error);
  }
}
