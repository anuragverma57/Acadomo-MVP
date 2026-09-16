import { Suspense } from "react";
import { SearchX } from "lucide-react";

import { FilterBar } from "@/components/filter-bar";
import { Hero } from "@/components/hero";
import { PropertyCard, PropertyCardSkeleton } from "@/components/property-card";
import { Button } from "@/components/ui/button";
import { currentStudentWithSaved } from "@/lib/session";
import { loadFilterOptions, searchProperties } from "@/lib/services/properties";
import { propertyFiltersSchema } from "@/lib/validation";

import Link from "next/link";

type SearchParams = Promise<Record<string, string | string[] | undefined>>;

function EmptyState() {
  return (
    <div className="flex flex-col items-center justify-center rounded-lg border border-dashed border-border py-16 text-center">
      <div className="rounded-full bg-muted p-3">
        <SearchX className="size-6 text-muted-foreground" aria-hidden />
      </div>
      <h2 className="mt-4 font-semibold">No properties match these filters</h2>
      <p className="mt-1 max-w-sm text-sm text-muted-foreground">
        Try widening your price range, or clearing a filter to see more results.
      </p>
      <Button render={<Link href="/" />} variant="outline" className="mt-6">
        Clear all filters
      </Button>
    </div>
  );
}

async function PropertyResults({ searchParams }: { searchParams: SearchParams }) {
  const raw = await searchParams;

  // Parse leniently: a bad param should fall back to defaults rather than
  // erroring a page a user may have reached from a stale link.
  const parsed = propertyFiltersSchema.safeParse(raw);
  const filters = parsed.success
    ? parsed.data
    : propertyFiltersSchema.parse({});

  // Server Components query the database directly — fetching our own API route
  // here would be a pointless network hop (CLAUDE.md §4).
  const [page, options, { student, savedIds }, catalogue] = await Promise.all([
    searchProperties(filters),
    loadFilterOptions(),
    currentStudentWithSaved(),
    // Unfiltered count, so the hero stat does not change as filters are applied.
    searchProperties(propertyFiltersSchema.parse({ pageSize: "1" })),
  ]);
  const totalCatalogue = catalogue.total;

  return (
    <>
      <Hero
        universities={options.universities}
        propertyCount={totalCatalogue}
        cityCount={options.cities.length}
      />

      <div className="mx-auto max-w-6xl space-y-6 px-4 py-8 md:px-6 md:py-10">
        <FilterBar options={options} resultCount={page.total} />

      {page.items.length === 0 ? (
        <EmptyState />
      ) : (
        <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {page.items.map((property, index) => (
            <PropertyCard
              key={property.id}
              property={property}
              priority={index < 3}
              saved={savedIds.has(property.id)}
              signedIn={Boolean(student)}
            />
          ))}
        </div>
      )}

        {page.totalPages > 1 ? (
          <Pagination page={page.page} totalPages={page.totalPages} params={raw} />
        ) : null}
      </div>
    </>
  );
}

function Pagination({
  page,
  totalPages,
  params,
}: {
  page: number;
  totalPages: number;
  params: Record<string, string | string[] | undefined>;
}) {
  const linkFor = (target: number) => {
    const next = new URLSearchParams();
    for (const [key, value] of Object.entries(params)) {
      if (typeof value === "string" && key !== "page") next.set(key, value);
    }
    if (target > 1) next.set("page", String(target));
    const qs = next.toString();
    return qs ? `/?${qs}` : "/";
  };

  return (
    <nav
      aria-label="Pagination"
      className="flex items-center justify-center gap-3 pt-4"
    >
      <Button
        render={<Link href={linkFor(page - 1)} />}
        variant="outline"
        size="lg"
        disabled={page <= 1}
        aria-disabled={page <= 1}
      >
        Previous
      </Button>
      <span className="text-sm text-muted-foreground tabular-nums">
        Page {page} of {totalPages}
      </span>
      <Button
        render={<Link href={linkFor(page + 1)} />}
        variant="outline"
        size="lg"
        disabled={page >= totalPages}
        aria-disabled={page >= totalPages}
      >
        Next
      </Button>
    </nav>
  );
}

function ResultsSkeleton() {
  return (
    <div className="mx-auto grid max-w-6xl gap-5 px-4 py-16 sm:grid-cols-2 md:px-6 lg:grid-cols-3">
      {Array.from({ length: 6 }, (_, i) => (
        <PropertyCardSkeleton key={i} />
      ))}
    </div>
  );
}

export default function HomePage({ searchParams }: { searchParams: SearchParams }) {
  return (
    <Suspense fallback={<ResultsSkeleton />}>
      <PropertyResults searchParams={searchParams} />
    </Suspense>
  );
}
