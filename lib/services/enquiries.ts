import {
  countEnquiriesByStatus,
  createEnquiry,
  listEnquiries,
  propertyExists,
  updateEnquiryStatus,
  type Enquiry,
} from "@/lib/db/queries";
import { searchEnquiries, type EnquiryPage } from "@/lib/db/queries";
import type { EnquiryFilters, EnquiryInput, EnquiryStatus } from "@/lib/validation";

/**
 * Enquiry business rules. Services take plain arguments and return plain data —
 * they never touch Request/Response, which keeps them testable and portable
 * (CLAUDE.md §2a).
 */

export type SubmitEnquiryResult =
  | { ok: true; id: number }
  | { ok: false; reason: "unknown_property" | "spam" };

export async function submitEnquiry(
  input: EnquiryInput,
  options: { studentId?: number | null } = {},
): Promise<SubmitEnquiryResult> {
  // Honeypot: the field is hidden from real users, so any content means a bot.
  // Fail as if accepted at the route layer so the bot learns nothing.
  if (input.company) {
    return { ok: false, reason: "spam" };
  }

  // Guard the foreign key so a bad propertyId returns a clean 404 rather than
  // surfacing a database constraint error.
  if (!(await propertyExists(input.propertyId))) {
    return { ok: false, reason: "unknown_property" };
  }

  const { id } = await createEnquiry({
    propertyId: input.propertyId,
    studentId: options.studentId ?? null,
    name: input.name,
    email: input.email,
    phone: input.phone,
    message: input.message,
  });

  return { ok: true, id };
}

export async function getEnquiries(status?: EnquiryStatus): Promise<Enquiry[]> {
  return listEnquiries(status);
}

export async function getEnquiryCounts() {
  return countEnquiriesByStatus();
}

export async function markEnquiryStatus(
  id: number,
  status: EnquiryStatus,
): Promise<Enquiry | null> {
  return updateEnquiryStatus(id, status);
}

export async function findEnquiries(
  filters: EnquiryFilters,
): Promise<EnquiryPage> {
  return searchEnquiries(filters);
}
