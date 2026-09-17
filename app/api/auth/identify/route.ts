import { clientIp, ok, serverError, tooManyRequests, validationFailed } from "@/lib/api";
import { adminExists } from "@/lib/db/queries";
import { rateLimit } from "@/lib/services/rate-limit";
import { requestOtpSchema } from "@/lib/validation";

/**
 * POST /api/auth/identify
 *
 * Decides which second step an email needs: a password (staff) or a one-time
 * code (students).
 *
 * ENUMERATION: this endpoint necessarily reveals whether an address is a staff
 * account, because the UI must show the right field. Two things bound the risk:
 * it is throttled per IP, and knowing an address is staff still requires the
 * password — login itself returns an identical error for unknown email and
 * wrong password, and always performs a bcrypt comparison. Student addresses
 * leak nothing at all: a non-admin email always returns "code", whether or not
 * an account exists.
 */
export async function POST(request: Request) {
  try {
    const limit = rateLimit(`identify:${clientIp(request)}`, 20, 5 * 60_000);
    if (!limit.allowed) {
      return tooManyRequests(limit.retryAfterSeconds);
    }

    const body = await request.json().catch(() => null);
    const parsed = requestOtpSchema.safeParse(body);

    if (!parsed.success) {
      return validationFailed(parsed.error);
    }

    const isAdmin = await adminExists(parsed.data.email);

    return ok({ method: isAdmin ? "password" : "code" });
  } catch (error) {
    return serverError("POST /api/auth/identify", error);
  }
}
