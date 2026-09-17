import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { Plus } from "lucide-react";

import { AdminPagination } from "@/components/admin-pagination";
import { PropertiesTable } from "@/components/properties-table";
import { PropertyFilters } from "@/components/property-filters";
import { Button } from "@/components/ui/button";
import { getAdminSession } from "@/lib/auth";
import {
  findAdminProperties,
  loadAdminPropertyCities,
} from "@/lib/services/admin-properties";
import { adminPropertyFiltersSchema } from "@/lib/validation";

export const metadata: Metadata = {
  title: "Properties",
  robots: { index: false, follow: false },
};

type Props = {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

export default async function AdminPropertiesPage({ searchParams }: Props) {
  // Middleware is UX; this is the authorization boundary.
  if (!(await getAdminSession())) redirect("/admin/login");

  const raw = await searchParams;

  // Parse leniently so a stale link falls back to defaults rather than erroring.
  const parsed = adminPropertyFiltersSchema.safeParse(raw);
  const filters = parsed.success
    ? parsed.data
    : adminPropertyFiltersSchema.parse({});

  const [page, cities] = await Promise.all([
    findAdminProperties(filters),
    loadAdminPropertyCities(),
  ]);

  return (
    <div className="mx-auto max-w-4xl px-4 py-8 md:py-10">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-display text-3xl">Properties</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            <span className="tabular">{page.activeCount}</span> visible ·{" "}
            <span className="tabular">{page.hiddenCount}</span> hidden
          </p>
        </div>
        <Button render={<Link href="/admin/properties/new" />} className="gap-2">
          <Plus className="size-4" aria-hidden />
          Add property
        </Button>
      </div>

      <div className="mt-8 space-y-6">
        <PropertyFilters cities={cities} total={page.total} />
        <PropertiesTable properties={page.items} />
        <AdminPagination
          page={page.page}
          totalPages={page.totalPages}
          params={raw}
          basePath="/admin/properties"
        />
      </div>
    </div>
  );
}
