"use client";

import { useEffect, useState } from "react";

import { FilterSelect, FilterShell } from "@/components/filter-shell";
import { useOptimisticParams } from "@/hooks/use-optimistic-params";

const STATUS = [
  { value: "all", label: "All statuses" },
  { value: "new", label: "New" },
  { value: "contacted", label: "Contacted" },
];

const RANGES = [
  { value: "all", label: "All time" },
  { value: "7d", label: "Last 7 days" },
  { value: "30d", label: "Last 30 days" },
  { value: "90d", label: "Last 90 days" },
];

const SORTS = [
  { value: "newest", label: "Newest first" },
  { value: "oldest", label: "Oldest first" },
  { value: "property", label: "By property" },
];

export function EnquiryFilters({ total }: { total: number }) {
  // Reads through an optimistic layer so a selection shows instantly rather
  // than after the server round-trip.
  const { params, setParams, clearAll, isPending } =
    useOptimisticParams("/admin");

  const status = params.status ?? "all";
  const range = params.range ?? "all";
  const sort = params.sort ?? "newest";
  const urlQuery = params.q ?? "";

  const [search, setSearch] = useState(urlQuery);
  const [seededFrom, setSeededFrom] = useState(urlQuery);

  // Adjust during render rather than in an effect when the URL changes
  // elsewhere (back button, clear).
  if (seededFrom !== urlQuery) {
    setSeededFrom(urlQuery);
    setSearch(urlQuery);
  }

  // Debounce typing so each keystroke does not hit the database.
  useEffect(() => {
    if (search === urlQuery) return;
    const timer = setTimeout(() => setParams({ q: search || undefined }), 350);
    return () => clearTimeout(timer);
  }, [search, urlQuery, setParams]);

  const activeCount = ["q", "status", "range"].filter((key) => params[key]).length;

  return (
    <FilterShell
      searchValue={search}
      onSearchChange={setSearch}
      searchPlaceholder="Search name, email, message or property"
      searchLabel="Search enquiries"
      activeCount={activeCount}
      onClear={clearAll}
      isPending={isPending}
      desktopColumns="lg:grid-cols-3"
      summary={
        <>
          <span className="font-medium text-foreground tabular">{total}</span>{" "}
          {total === 1 ? "enquiry" : "enquiries"}
        </>
      }
    >
      <FilterSelect
        label="Status"
        value={status}
        options={STATUS}
        onChange={(value) => setParams({ status: value })}
      />
      <FilterSelect
        label="Date range"
        value={range}
        options={RANGES}
        onChange={(value) => setParams({ range: value })}
      />
      <FilterSelect
        label="Sort"
        value={sort}
        options={SORTS}
        onChange={(value) => setParams({ sort: value })}
      />
    </FilterShell>
  );
}
