import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";

import { AdminSignOut } from "@/components/admin-sign-out";
import { EnquiriesTable } from "@/components/enquiries-table";
import { getAdminSession } from "@/lib/auth";
import { getEnquiries, getEnquiryCounts } from "@/lib/services/enquiries";
import { ENQUIRY_STATUSES, type EnquiryStatus } from "@/lib/validation";
import { cn } from "@/lib/utils";

export const metadata: Metadata = {
  title: "Enquiries",
  robots: { index: false, follow: false },
};

type Props = {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

const TABS = [
  { key: undefined, label: "All" },
  { key: "new" as const, label: "New" },
  { key: "contacted" as const, label: "Contacted" },
];

export default async function AdminDashboardPage({ searchParams }: Props) {
  // Middleware only checks that a cookie exists. This verifies the signature
  // and the realm — it is the actual authorization boundary (CLAUDE.md §3).
  const session = await getAdminSession();
  if (!session) {
    redirect("/admin/login");
  }

  const raw = await searchParams;
  const statusParam = typeof raw.status === "string" ? raw.status : undefined;
  const status = ENQUIRY_STATUSES.includes(statusParam as EnquiryStatus)
    ? (statusParam as EnquiryStatus)
    : undefined;

  const [enquiries, counts] = await Promise.all([
    getEnquiries(status),
    getEnquiryCounts(),
  ]);

  return (
    <div className="mx-auto max-w-6xl px-4 py-8 md:py-10">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Enquiries</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Signed in as {session.email}
            <span className="text-muted-foreground/60"> · {session.role}</span>
          </p>
        </div>
        <AdminSignOut />
      </div>

      <nav
        aria-label="Filter enquiries"
        className="mt-6 flex gap-1 border-b border-border"
      >
        {TABS.map((tab) => {
          const active = status === tab.key;
          const count = tab.key ? counts[tab.key] : counts.all;

          return (
            <Link
              key={tab.label}
              href={tab.key ? `/admin?status=${tab.key}` : "/admin"}
              aria-current={active ? "page" : undefined}
              className={cn(
                "-mb-px border-b-2 px-4 py-2.5 text-sm font-medium transition-colors",
                active
                  ? "border-primary text-foreground"
                  : "border-transparent text-muted-foreground hover:text-foreground",
              )}
            >
              {tab.label}
              <span className="ml-1.5 text-xs text-muted-foreground tabular-nums">
                {count}
              </span>
            </Link>
          );
        })}
      </nav>

      <div className="mt-6">
        <EnquiriesTable enquiries={enquiries} />
      </div>
    </div>
  );
}
