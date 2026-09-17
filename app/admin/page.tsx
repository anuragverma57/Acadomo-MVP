import type { Metadata } from "next";
import { redirect } from "next/navigation";

import { AdminPagination } from "@/components/admin-pagination";
import { EnquiriesList } from "@/components/enquiries-table";
import { EnquiryFilters } from "@/components/enquiry-filters";
import { getAdminSession } from "@/lib/auth";
import { findEnquiries, getEnquiryCounts } from "@/lib/services/enquiries";
import { enquiryFiltersSchema } from "@/lib/validation";

export const metadata: Metadata = {
  title: "Enquiries",
  robots: { index: false, follow: false },
};

type Props = {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

export default async function AdminDashboardPage({ searchParams }: Props) {
  // Middleware only checks the cookie exists. This verifies signature and
  // realm — the actual authorization boundary (CLAUDE.md §3).
  const session = await getAdminSession();
  if (!session) redirect("/admin/login");

  const raw = await searchParams;

  // Parse leniently: a stale or hand-edited link falls back to defaults rather
  // than erroring the page.
  const parsed = enquiryFiltersSchema.safeParse(raw);
  const filters = parsed.success ? parsed.data : enquiryFiltersSchema.parse({});

  const [page, counts] = await Promise.all([
    findEnquiries(filters),
    getEnquiryCounts(),
  ]);

  return (
    <div className="mx-auto max-w-4xl px-4 py-8 md:py-10">
      <div>
        <h1 className="text-display text-3xl">Enquiries</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          {counts.all} total · <span className="tabular">{counts.new}</span> new ·{" "}
          <span className="tabular">{counts.contacted}</span> contacted
        </p>
      </div>

      <div className="mt-8 space-y-6">
        <EnquiryFilters total={page.total} />
        <EnquiriesList enquiries={page.items} />
        <AdminPagination
          page={page.page}
          totalPages={page.totalPages}
          params={raw}
        />
      </div>
    </div>
  );
}
