import { badRequest, ok, serverError, unauthorized, validationFailed } from "@/lib/api";
import { getStudentSession } from "@/lib/auth";
import { saveStudentProfile } from "@/lib/services/students";
import { studentProfileSchema } from "@/lib/validation";

/**
 * PATCH /api/account — update the signed-in student's optional profile.
 *
 * Authorization is checked here, in the handler, not in proxy.ts: the proxy
 * only sees that a cookie exists (CLAUDE.md §3).
 */
export async function PATCH(request: Request) {
  try {
    const session = await getStudentSession();
    if (!session) return unauthorized();

    const body = await request.json().catch(() => null);
    if (body === null) return badRequest("Expected a JSON body");

    const parsed = studentProfileSchema.safeParse(body);
    if (!parsed.success) return validationFailed(parsed.error);

    // The id comes from the verified session, never the body.
    const student = await saveStudentProfile(session.studentId, parsed.data);
    if (!student) return unauthorized();

    return ok({
      name: student.name,
      phone: student.phone,
      gender: student.gender,
      university: student.university,
      course: student.course,
      yearOfStudy: student.yearOfStudy,
    });
  } catch (error) {
    return serverError("PATCH /api/account", error);
  }
}
