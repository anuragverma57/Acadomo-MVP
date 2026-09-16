import { Suspense } from "react";
import { SearchX } from "lucide-react";

import { FilterBar } from "@/components/filter-bar";
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
  const [page, options, { student, savedIds }] = await Promise.all([
    searchProperties(filters),
    loadFilterOptions(),
    currentStudentWithSaved(),
  ]);

  return (
    <>
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
    <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
      {Array.from({ length: 6 }, (_, i) => (
        <PropertyCardSkeleton key={i} />
      ))}
    </div>
  );
}

export default function HomePage({ searchParams }: { searchParams: SearchParams }) {
  return (
    <div className="mx-auto max-w-6xl px-4 py-8 md:py-12">
      <section className="max-w-2xl">
        <h1 className="text-3xl font-semibold tracking-tight text-balance md:text-4xl">
          Student accommodation, without the guesswork.
        </h1>
        <p className="mt-3 text-muted-foreground text-pretty">
          Compare verified student housing near your university. Filter by city,
          university, room type and budget.
        </p>
      </section>

      <div className="mt-8 space-y-6">
        <Suspense fallback={<ResultsSkeleton />}>
          <PropertyResults searchParams={searchParams} />
        </Suspense>
      </div>
    </div>
  );
}
