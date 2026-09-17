import { ok, serverError, unauthorized, validationFailed } from "@/lib/api";
import { getAdminSession } from "@/lib/auth";
import { addProperty, getAllProperties } from "@/lib/services/admin-properties";
import { propertyInputSchema } from "@/lib/validation";

/** GET /api/admin/properties — includes inactive rows. */
export async function GET() {
  try {
    // Middleware is UX. This is the security boundary (CLAUDE.md §3).
    const session = await getAdminSession();
    if (!session) return unauthorized();

    return ok({ items: await getAllProperties() });
  } catch (error) {
    return serverError("GET /api/admin/properties", error);
  }
}

/** POST /api/admin/properties */
export async function POST(request: Request) {
  try {
    const session = await getAdminSession();
    if (!session) return unauthorized();

    const body = await request.json().catch(() => null);
    const parsed = propertyInputSchema.safeParse(body);
    if (!parsed.success) return validationFailed(parsed.error);

    const property = await addProperty(parsed.data);
    return ok(property, { status: 201 });
  } catch (error) {
    return serverError("POST /api/admin/properties", error);
  }
}
