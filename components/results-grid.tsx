"use client";

import { useFilterParams } from "@/hooks/use-filter-params";
import { cn } from "@/lib/utils";

/**
 * Dims the grid while a filter change is in flight.
 *
 * Without this the UI is inert for the whole server round-trip and then snaps
 * to new results, which reads as a glitch rather than a load.
 */
export function ResultsGrid({ children }: { children: React.ReactNode }) {
  const { isPending } = useFilterParams();

  return (
    <div
      aria-busy={isPending}
      className={cn(
        "grid gap-5 transition-opacity duration-200 sm:grid-cols-2 lg:grid-cols-3",
        isPending && "pointer-events-none opacity-50",
      )}
    >
      {children}
    </div>
  );
}
