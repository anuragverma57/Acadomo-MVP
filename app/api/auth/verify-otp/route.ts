import { badRequest, ok, serverError, validationFailed } from "@/lib/api";
import { createStudentSession } from "@/lib/auth";
import { verifyOtp } from "@/lib/services/otp";
import { verifyOtpSchema } from "@/lib/validation";

const MESSAGES = {
  invalid: "That code isn't right. Check it and try again.",
  expired: "That code has expired. Request a new one.",
  too_many_attempts: "Too many incorrect attempts. Request a new code.",
} as const;

/** POST /api/auth/verify-otp */
export async function POST(request: Request) {
  try {
    const body = await request.json().catch(() => null);
    const parsed = verifyOtpSchema.safeParse(body);

    if (!parsed.success) {
      return validationFailed(parsed.error);
    }

    const result = await verifyOtp(parsed.data.email, parsed.data.code);

    if (!result.ok) {
      return badRequest(MESSAGES[result.reason]);
    }

    await createStudentSession({
      studentId: result.student.id,
      email: result.student.email,
    });

    return ok({ email: result.student.email, name: result.student.name });
  } catch (error) {
    return serverError("POST /api/auth/verify-otp", error);
  }
}
