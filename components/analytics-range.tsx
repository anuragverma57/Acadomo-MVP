"use client";

import { cn } from "@/lib/utils";
import { useOptimisticParams } from "@/hooks/use-optimistic-params";
import { ANALYTICS_RANGES, type AnalyticsRange } from "@/lib/validation";

const LABELS: Record<AnalyticsRange, string> = {
  "7d": "7 days",
  "30d": "30 days",
  "90d": "90 days",
};

/**
 * Segmented range control. Reads through useOptimistic so the pressed segment
 * highlights on tap rather than after the server responds (CLAUDE.md §5).
 */
export function AnalyticsRangePicker() {
  const { params, setParams, isPending } = useOptimisticParams("/admin/analytics");
  const active = (params.range as AnalyticsRange) ?? "30d";

  return (
    <div
      role="group"
      aria-label="Date range"
      data-pending={isPending || undefined}
      className="inline-flex rounded-lg bg-muted p-1 data-pending:opacity-70"
    >
      {ANALYTICS_RANGES.map((range) => {
        const selected = range === active;
        return (
          <button
            key={range}
            type="button"
            aria-pressed={selected}
            onClick={() => setParams({ range })}
            className={cn(
              // 44px min target: this is the primary control on a phone.
              "min-h-11 rounded-md px-4 text-sm font-medium transition-colors",
              "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring",
              selected
                ? "bg-background text-foreground shadow-sm"
                : "text-muted-foreground hover:text-foreground",
            )}
          >
            {LABELS[range]}
          </button>
        );
      })}
    </div>
  );
}
