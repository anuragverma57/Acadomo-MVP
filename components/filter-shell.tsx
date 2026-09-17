"use client";

import { Loader2, Search, SlidersHorizontal, X } from "lucide-react";

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

/**
 * Shared filter chrome for list pages.
 *
 * Mobile gets a search field plus a single "Filters" button opening a bottom
 * sheet; desktop shows the controls inline. Stacking four full-width selects
 * down a phone screen — which the admin pages used to do — pushes the actual
 * results below the fold.
 */

export type FilterOption = { value: string; label: string };

/** A select whose label is rendered explicitly, because Base UI's SelectValue
 *  falls back to the raw value when it cannot resolve one. */
export function FilterSelect({
  label,
  value,
  options,
  onChange,
}: {
  label: string;
  value: string;
  options: FilterOption[];
  onChange: (value: string) => void;
}) {
  const current = options.find((option) => option.value === value);

  return (
    <div className="space-y-1.5">
      <label className="text-xs font-medium text-muted-foreground">{label}</label>
      <Select value={value} onValueChange={(next) => onChange(String(next))}>
        <SelectTrigger className="w-full">
          <SelectValue>{current?.label ?? options[0]?.label}</SelectValue>
        </SelectTrigger>
        <SelectContent>
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

export function FilterShell({
  searchValue,
  onSearchChange,
  searchPlaceholder,
  searchLabel,
  activeCount,
  onClear,
  isPending,
  summary,
  desktopColumns = "lg:grid-cols-4",
  children,
}: {
  searchValue: string;
  onSearchChange: (value: string) => void;
  searchPlaceholder: string;
  searchLabel: string;
  activeCount: number;
  onClear: () => void;
  isPending: boolean;
  /** Result count line, e.g. "341 enquiries". */
  summary: React.ReactNode;
  desktopColumns?: string;
  /** The filter controls — rendered once on mobile, once on desktop. */
  children: React.ReactNode;
}) {
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
            onChange={(event) => onSearchChange(event.target.value)}
            placeholder={searchPlaceholder}
            aria-label={searchLabel}
            className="h-11 pl-9"
          />
        </div>

        {/* Mobile: one button, filters live in a bottom sheet. */}
        <Sheet>
          <SheetTrigger
            render={
              <Button variant="outline" className="h-11 gap-2 md:hidden">
                <SlidersHorizontal className="size-4" aria-hidden />
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
            <div className="space-y-5 px-4 pb-8">
              {children}
              {activeCount > 0 ? (
                <Button variant="ghost" onClick={onClear} className="w-full gap-2">
                  <X className="size-4" aria-hidden />
                  Clear all filters
                </Button>
              ) : null}
            </div>
          </SheetContent>
        </Sheet>
      </div>

      {/* Desktop: inline. */}
      <div className={`hidden gap-3 md:grid md:grid-cols-2 ${desktopColumns}`}>
        {children}
      </div>

      <div className="flex items-center justify-between gap-4">
        <p
          className="flex items-center gap-2 text-sm text-muted-foreground"
          aria-live="polite"
          aria-busy={isPending}
        >
          {isPending ? (
            <>
              <Loader2 className="size-3.5 animate-spin" aria-hidden />
              Updating…
            </>
          ) : (
            summary
          )}
        </p>

        {activeCount > 0 ? (
          <Button
            variant="ghost"
            size="sm"
            onClick={onClear}
            className="hidden gap-1.5 md:inline-flex"
          >
            <X className="size-3.5" aria-hidden />
            Clear
          </Button>
        ) : null}
      </div>
    </div>
  );
}
