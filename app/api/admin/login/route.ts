import {
  clientIp,
  ok,
  serverError,
  tooManyRequests,
  unauthorized,
  validationFailed,
} from "@/lib/api";
import { createAdminSession } from "@/lib/auth";
import { authenticateAdmin } from "@/lib/services/auth";
import { rateLimit } from "@/lib/services/rate-limit";
import { adminLoginSchema } from "@/lib/validation";

const MAX_ATTEMPTS = 8;
const WINDOW_MS = 5 * 60_000;

/** POST /api/admin/login */
export async function POST(request: Request) {
  try {
    // Throttle by IP so the login form is not a free password-guessing oracle.
    const limit = rateLimit(
      `admin-login:${clientIp(request)}`,
      MAX_ATTEMPTS,
      WINDOW_MS,
    );
    if (!limit.allowed) {
      return tooManyRequests(limit.retryAfterSeconds);
    }

    const body = await request.json().catch(() => null);
    const parsed = adminLoginSchema.safeParse(body);

    if (!parsed.success) {
      return validationFailed(parsed.error);
    }

    const result = await authenticateAdmin(
      parsed.data.email,
      parsed.data.password,
    );

    if (!result.ok) {
      // Identical message for unknown email and wrong password.
      return unauthorized("Incorrect email or password");
    }

    await createAdminSession({
      userId: result.userId,
      email: result.email,
      role: result.role,
    });

    return ok({ email: result.email, role: result.role });
  } catch (error) {
    return serverError("POST /api/admin/login", error);
  }
}
