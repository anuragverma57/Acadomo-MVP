"use client";

import { useEffect, useState } from "react";

import { FilterSelect, FilterShell } from "@/components/filter-shell";
import { useOptimisticParams } from "@/hooks/use-optimistic-params";
import { roomTypeLabel } from "@/lib/format";
import { ROOM_TYPES } from "@/lib/validation";

const VISIBILITY = [
  { value: "all", label: "All listings" },
  { value: "active", label: "Visible only" },
  { value: "hidden", label: "Hidden only" },
];

const SORTS = [
  { value: "newest", label: "Newest first" },
  { value: "oldest", label: "Oldest first" },
  { value: "title", label: "Title A–Z" },
  { value: "price_asc", label: "Price: low to high" },
  { value: "price_desc", label: "Price: high to low" },
];

export function PropertyFilters({
  cities,
  total,
}: {
  cities: string[];
  total: number;
}) {
  // Reads through an optimistic layer so a selection shows instantly rather
  // than after the server round-trip.
  const { params, setParams, clearAll, isPending } =
    useOptimisticParams("/admin/properties");

  const visibility = params.visibility ?? "all";
  const city = params.city ?? "all";
  const roomType = params.roomType ?? "all";
  const sort = params.sort ?? "newest";
  const urlQuery = params.q ?? "";

  const [search, setSearch] = useState(urlQuery);
  const [seededFrom, setSeededFrom] = useState(urlQuery);

  if (seededFrom !== urlQuery) {
    setSeededFrom(urlQuery);
    setSearch(urlQuery);
  }

  useEffect(() => {
    if (search === urlQuery) return;
    const timer = setTimeout(() => setParams({ q: search || undefined }), 350);
    return () => clearTimeout(timer);
  }, [search, urlQuery, setParams]);

  const activeCount = ["q", "city", "roomType", "visibility"].filter((key) => params[key]).length;

  const cityOptions = [
    { value: "all", label: "All cities" },
    ...cities.map((value) => ({ value, label: value })),
  ];

  const roomOptions = [
    { value: "all", label: "All room types" },
    ...ROOM_TYPES.map((value) => ({ value, label: roomTypeLabel(value) })),
  ];

  return (
    <FilterShell
      searchValue={search}
      onSearchChange={setSearch}
      searchPlaceholder="Search title, city or university"
      searchLabel="Search properties"
      activeCount={activeCount}
      onClear={clearAll}
      isPending={isPending}
      summary={
        <>
          <span className="font-medium text-foreground tabular">{total}</span>{" "}
          {total === 1 ? "property" : "properties"}
        </>
      }
    >
      <FilterSelect
        label="Visibility"
        value={visibility}
        options={VISIBILITY}
        onChange={(value) => setParams({ visibility: value })}
      />
      <FilterSelect
        label="City"
        value={city}
        options={cityOptions}
        onChange={(value) => setParams({ city: value })}
      />
      <FilterSelect
        label="Room type"
        value={roomType}
        options={roomOptions}
        onChange={(value) => setParams({ roomType: value })}
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
