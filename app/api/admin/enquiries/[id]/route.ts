import {
  badRequest,
  notFound,
  ok,
  serverError,
  unauthorized,
  validationFailed,
} from "@/lib/api";
import { getAdminSession } from "@/lib/auth";
import { markEnquiryStatus } from "@/lib/services/enquiries";
import { enquiryStatusSchema } from "@/lib/validation";

/** PATCH /api/admin/enquiries/[id] — update status */
export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const session = await getAdminSession();
    if (!session) {
      return unauthorized();
    }

    const { id } = await params;
    const enquiryId = Number(id);
    if (!Number.isInteger(enquiryId) || enquiryId < 1) {
      return badRequest("Invalid enquiry id");
    }

    const body = await request.json().catch(() => null);
    const parsed = enquiryStatusSchema.safeParse(body);
    if (!parsed.success) {
      return validationFailed(parsed.error);
    }

    const updated = await markEnquiryStatus(enquiryId, parsed.data.status);
    if (!updated) {
      return notFound("Enquiry not found");
    }

    return ok(updated);
  } catch (error) {
    return serverError("PATCH /api/admin/enquiries/[id]", error);
  }
}
