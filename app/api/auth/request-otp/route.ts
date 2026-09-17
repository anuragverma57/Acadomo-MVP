import { clientIp, ok, serverError, tooManyRequests, validationFailed } from "@/lib/api";
import { requestOtp } from "@/lib/services/otp";
import { requestOtpSchema } from "@/lib/validation";

/**
 * POST /api/auth/request-otp
 *
 * Always responds the same way whether or not an account exists, so this
 * endpoint cannot be used to discover which emails are registered.
 */
export async function POST(request: Request) {
  try {
    const body = await request.json().catch(() => null);
    const parsed = requestOtpSchema.safeParse(body);

    if (!parsed.success) {
      return validationFailed(parsed.error);
    }

    const result = await requestOtp(parsed.data.email, clientIp(request));

    if (!result.ok) {
      return tooManyRequests(result.retryAfterSeconds);
    }

    // demoCode is present only when demo mode is on (see isDemoOtpEnabled).
    return ok({ sent: true, demoCode: result.demoCode });
  } catch (error) {
    return serverError("POST /api/auth/request-otp", error);
  }
}
