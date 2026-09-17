import Link from "next/link";
import { ArrowDownRight, ArrowUpRight, Minus } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import type { AnalyticsSummary, TopProperty } from "@/lib/db/queries";
import { cn } from "@/lib/utils";

function Delta({ value }: { value: number | null }) {
  // No prior window to compare against — "+100%" from zero is not information.
  if (value === null) {
    return (
      <span className="inline-flex items-center gap-1 text-xs text-muted-foreground">
        <Minus className="size-3" aria-hidden />
        no prior data
      </span>
    );
  }

  const up = value >= 0;
  const Icon = up ? ArrowUpRight : ArrowDownRight;

  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 text-xs font-medium",
        up ? "text-primary" : "text-destructive",
      )}
    >
      <Icon className="size-3" aria-hidden />
      {up ? "+" : ""}
      {value}%
      <span className="font-normal text-muted-foreground">vs previous</span>
    </span>
  );
}

function Stat({
  label,
  value,
  delta,
  hint,
}: {
  label: string;
  value: string;
  delta?: number | null;
  hint?: string;
}) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-xs font-medium tracking-wide text-muted-foreground uppercase">
          {label}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-1">
        <p className="font-display text-3xl tabular-nums">{value}</p>
        {delta !== undefined ? <Delta value={delta} /> : null}
        {hint ? <p className="text-xs text-muted-foreground">{hint}</p> : null}
      </CardContent>
    </Card>
  );
}

export function AnalyticsStats({ summary }: { summary: AnalyticsSummary }) {
  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
      <Stat
        label="Views"
        value={summary.views.toLocaleString()}
        delta={summary.viewsChange}
      />
      <Stat
        label="Enquiries"
        value={summary.enquiries.toLocaleString()}
        delta={summary.enquiriesChange}
      />
      <Stat
        label="Conversion"
        value={`${summary.conversionRate}%`}
        hint="Enquiries per 100 views"
      />
      <Stat
        label="Live listings"
        value={summary.activeProperties.toLocaleString()}
        hint="Visible to students now"
      />
    </div>
  );
}

export function TopPropertiesList({ properties }: { properties: TopProperty[] }) {
  if (properties.length === 0) {
    return (
      <p className="py-8 text-center text-sm text-muted-foreground">
        No activity in this period yet.
      </p>
    );
  }

  return (
    <ol className="divide-y divide-border">
      {properties.map((property, index) => (
        <li key={property.id}>
          <Link
            href={`/properties/${property.slug}`}
            className="flex items-center gap-3 py-3 transition-colors hover:bg-muted/50 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
          >
            <span className="w-5 shrink-0 text-sm tabular-nums text-muted-foreground">
              {index + 1}
            </span>

            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-medium">{property.title}</p>
              <p className="truncate text-xs text-muted-foreground">
                {property.city}
                {property.isActive ? null : (
                  <Badge variant="outline" className="ml-2 align-middle">
                    Hidden
                  </Badge>
                )}
              </p>
            </div>

            <div className="shrink-0 text-right">
              <p className="text-sm tabular-nums">
                {property.views.toLocaleString()}
                <span className="ml-1 text-xs text-muted-foreground">views</span>
              </p>
              <p className="text-xs tabular-nums text-muted-foreground">
                {property.enquiries} enquiries · {property.conversionRate}%
              </p>
            </div>
          </Link>
        </li>
      ))}
    </ol>
  );
}
