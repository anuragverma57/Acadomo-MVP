"use client";

import { useEffect, useState } from "react";
import { Search, SlidersHorizontal, X } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import { Slider } from "@/components/ui/slider";
import { useFilterParams } from "@/hooks/use-filter-params";
import type { FilterOptions } from "@/lib/db/queries";
import { formatPrice, roomTypeLabel } from "@/lib/format";

const ANY = "__any__";

function SelectFilter({
  label,
  value,
  options,
  onChange,
}: {
  label: string;
  value: string | undefined;
  options: { value: string; label: string }[];
  onChange: (value: string | undefined) => void;
}) {
  return (
    <div className="space-y-1.5">
      <label className="text-xs font-medium text-muted-foreground">{label}</label>
      <Select
        value={value ?? ANY}
        onValueChange={(next) =>
          onChange(next === ANY ? undefined : String(next))
        }
      >
        <SelectTrigger className="w-full">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value={ANY}>Any {label.toLowerCase()}</SelectItem>
          {options.map((option) => (
            <SelectItem key={option.value} value={option.value}>
              {option.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}

function FilterControls({
  options,
  className,
}: {
  options: FilterOptions;
  className?: string;
}) {
  const { params, setParams } = useFilterParams();

  const minBound = options.priceRange.min;
  const maxBound = options.priceRange.max;

  const currentMin = params.minPrice ? Number(params.minPrice) : minBound;
  const currentMax = params.maxPrice ? Number(params.maxPrice) : maxBound;

  // Local state keeps the slider responsive while dragging; the URL is only
  // written on commit, avoiding a database query per pixel of movement.
  // `draft` is null whenever the slider is not mid-drag, so the URL stays the
  // source of truth and no effect is needed to sync the two.
  const [draft, setDraft] = useState<number[] | null>(null);
  const range = draft ?? [currentMin, currentMax];

  return (
    <div className={className}>
      <SelectFilter
        label="City"
        value={params.city}
        options={options.cities.map((c) => ({ value: c, label: c }))}
        onChange={(city) => setParams({ city })}
      />

      <SelectFilter
        label="University"
        value={params.university}
        options={options.universities.map((u) => ({ value: u, label: u }))}
        onChange={(university) => setParams({ university })}
      />

      <SelectFilter
        label="Room type"
        value={params.roomType}
        options={options.roomTypes.map((r) => ({
          value: r,
          label: roomTypeLabel(r),
        }))}
        onChange={(roomType) => setParams({ roomType })}
      />

      <div className="space-y-3">
        <div className="flex items-baseline justify-between">
          <label className="text-xs font-medium text-muted-foreground">
            Price per week
          </label>
          <span className="text-sm font-medium tabular-nums">
            {formatPrice(range[0]!)} – {formatPrice(range[1]!)}
          </span>
        </div>
        <Slider
          value={range}
          min={minBound}
          max={maxBound}
          step={500}
          onValueChange={(value) =>
            setDraft(Array.isArray(value) ? value : [value, value])
          }
          onValueCommitted={(value) => {
            const [min, max] = Array.isArray(value) ? value : [value, value];
            setDraft(null);
            setParams({
              minPrice: min === minBound ? undefined : String(min),
              maxPrice: max === maxBound ? undefined : String(max),
            });
          }}
          aria-label="Price per week range"
        />
      </div>
    </div>
  );
}

export function FilterBar({
  options,
  resultCount,
}: {
  options: FilterOptions;
  resultCount: number;
}) {
  const { params, setParams, clearAll, activeCount } = useFilterParams();

  // Adjusting state during render (rather than in an effect) is React's
  // documented way to reset local state when a prop changes — here, when the
  // URL's q changes from elsewhere (back button, clear-all).
  const urlQuery = params.q ?? "";
  const [searchValue, setSearchValue] = useState(urlQuery);
  const [seededFrom, setSeededFrom] = useState(urlQuery);

  if (seededFrom !== urlQuery) {
    setSeededFrom(urlQuery);
    setSearchValue(urlQuery);
  }

  // Debounce so typing does not fire a query per keystroke. This is a genuine
  // external-system effect (a timer writing to the URL), not state sync.
  useEffect(() => {
    if (searchValue === urlQuery) return;

    const timer = setTimeout(
      () => setParams({ q: searchValue || undefined }),
      350,
    );
    return () => clearTimeout(timer);
  }, [searchValue, urlQuery, setParams]);

  return (
    <div className="space-y-4">
      <div className="flex gap-2">
        <div className="relative flex-1">
          <Search
            className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground"
            aria-hidden
          />
          <Input
            type="search"
            value={searchValue}
            onChange={(event) => setSearchValue(event.target.value)}
            placeholder="Search by city, university or property"
            aria-label="Search properties"
            className="h-11 pl-9"
          />
        </div>

        {/* Mobile: filters live in a bottom sheet, the native pattern. */}
        <Sheet>
          <SheetTrigger
            render={
              <Button variant="outline" className="h-11 gap-2 md:hidden">
                <SlidersHorizontal className="size-4" />
                Filters
                {activeCount > 0 ? (
                  <Badge variant="secondary" className="ml-0.5">
                    {activeCount}
                  </Badge>
                ) : null}
              </Button>
            }
          />
          <SheetContent side="bottom" className="max-h-[85vh] overflow-y-auto">
            <SheetHeader>
              <SheetTitle>Filters</SheetTitle>
            </SheetHeader>
            <div className="px-4 pb-8">
              <FilterControls options={options} className="space-y-5" />
              {activeCount > 0 ? (
                <Button
                  variant="ghost"
                  onClick={clearAll}
                  className="mt-6 w-full gap-2"
                >
                  <X className="size-4" />
                  Clear all filters
                </Button>
              ) : null}
            </div>
          </SheetContent>
        </Sheet>
      </div>

      {/* Desktop: filters inline. */}
      <div className="hidden md:block">
        <FilterControls
          options={options}
          className="grid grid-cols-2 items-end gap-4 lg:grid-cols-4"
        />
      </div>

      <div className="flex items-center justify-between gap-4">
        <p className="text-sm text-muted-foreground" aria-live="polite">
          <span className="font-medium text-foreground">{resultCount}</span>{" "}
          {resultCount === 1 ? "property" : "properties"}
          {params.city ? ` in ${params.city}` : ""}
        </p>

        {activeCount > 0 ? (
          <Button
            variant="ghost"
            size="sm"
            onClick={clearAll}
            className="hidden gap-1.5 md:inline-flex"
          >
            <X className="size-3.5" />
            Clear filters
          </Button>
        ) : null}
      </div>
    </div>
  );
}
