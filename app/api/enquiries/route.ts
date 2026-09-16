import {
  clientIp,
  notFound,
  ok,
  serverError,
  tooManyRequests,
  validationFailed,
} from "@/lib/api";
import { submitEnquiry } from "@/lib/services/enquiries";
import { rateLimit } from "@/lib/services/rate-limit";
import { enquiryInputSchema } from "@/lib/validation";

const MAX_PER_WINDOW = 5;
const WINDOW_MS = 60_000;

/**
 * POST /api/enquiries
 * The only public write endpoint. Protected by server-side validation, an
 * IP throttle, and a honeypot field (CLAUDE.md §3).
 */
export async function POST(request: Request) {
  try {
    const limit = rateLimit(
      `enquiry:${clientIp(request)}`,
      MAX_PER_WINDOW,
      WINDOW_MS,
    );
    if (!limit.allowed) {
      return tooManyRequests(limit.retryAfterSeconds);
    }

    const body = await request.json().catch(() => null);
    const parsed = enquiryInputSchema.safeParse(body);

    if (!parsed.success) {
      return validationFailed(parsed.error);
    }

    const result = await submitEnquiry(parsed.data);

    if (!result.ok) {
      if (result.reason === "unknown_property") {
        return notFound("Property not found");
      }
      // Spam: respond exactly as success so the bot gets no signal.
      return ok({ id: null, received: true }, { status: 201 });
    }

    return ok({ id: result.id, received: true }, { status: 201 });
  } catch (error) {
    return serverError("POST /api/enquiries", error);
  }
}
