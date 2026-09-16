import { badRequest, notFound, ok, serverError, unauthorized } from "@/lib/api";
import { getStudentSession } from "@/lib/auth";
import { propertyExists, saveProperty, unsaveProperty } from "@/lib/db/queries";

/**
 * POST / DELETE /api/saved/[id]
 *
 * The student is resolved from the session cookie — never from the request
 * body — so one student cannot modify another's shortlist.
 */
async function resolve(params: Promise<{ id: string }>) {
  const session = await getStudentSession();
  if (!session) return { error: unauthorized("Sign in to save properties") };

  const { id } = await params;
  const propertyId = Number(id);
  if (!Number.isInteger(propertyId) || propertyId < 1) {
    return { error: badRequest("Invalid property id") };
  }

  return { session, propertyId };
}

export async function POST(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const resolved = await resolve(params);
    if (resolved.error) return resolved.error;

    if (!(await propertyExists(resolved.propertyId))) {
      return notFound("Property not found");
    }

    await saveProperty(resolved.session.studentId, resolved.propertyId);
    return ok({ saved: true });
  } catch (error) {
    return serverError("POST /api/saved/[id]", error);
  }
}

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const resolved = await resolve(params);
    if (resolved.error) return resolved.error;

    await unsaveProperty(resolved.session.studentId, resolved.propertyId);
    return ok({ saved: false });
  } catch (error) {
    return serverError("DELETE /api/saved/[id]", error);
  }
}
