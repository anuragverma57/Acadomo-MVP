import { ok, serverError, unauthorized } from "@/lib/api";
import { getAdminSession } from "@/lib/auth";
import { getEnquiries, getEnquiryCounts } from "@/lib/services/enquiries";
import { ENQUIRY_STATUSES, type EnquiryStatus } from "@/lib/validation";

/** GET /api/admin/enquiries?status=new|contacted */
export async function GET(request: Request) {
  try {
    // Middleware is UX. THIS is the security boundary (CLAUDE.md §3).
    const session = await getAdminSession();
    if (!session) {
      return unauthorized();
    }

    const statusParam = new URL(request.url).searchParams.get("status");
    const status = ENQUIRY_STATUSES.includes(statusParam as EnquiryStatus)
      ? (statusParam as EnquiryStatus)
      : undefined;

    const [items, counts] = await Promise.all([
      getEnquiries(status),
      getEnquiryCounts(),
    ]);

    return ok({ items, counts });
  } catch (error) {
    return serverError("GET /api/admin/enquiries", error);
  }
}
