import type { Metadata } from "next";
import { redirect } from "next/navigation";

import { AnalyticsRangePicker } from "@/components/analytics-range";
import { BreakdownChart, TrendChart } from "@/components/analytics-chart";
import { AnalyticsStats, TopPropertiesList } from "@/components/analytics-stats";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { getAdminSession } from "@/lib/auth";
import { loadAnalytics } from "@/lib/services/analytics";
import { analyticsFiltersSchema } from "@/lib/validation";

export const metadata: Metadata = {
  title: "Analytics",
  robots: { index: false, follow: false },
};

type Props = {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

const RANGE_LABEL = {
  "7d": "last 7 days",
  "30d": "last 30 days",
  "90d": "last 90 days",
} as const;

export default async function AnalyticsPage({ searchParams }: Props) {
  // proxy.ts only checks the cookie exists. This verifies signature and realm —
  // the actual authorization boundary (CLAUDE.md §3).
  const session = await getAdminSession();
  if (!session) redirect("/admin/login");

  const raw = await searchParams;

  // Parse leniently: a stale link falls back to the default window rather than
  // erroring the page.
  const parsed = analyticsFiltersSchema.safeParse(raw);
  const { range } = parsed.success ? parsed.data : analyticsFiltersSchema.parse({});

  const { summary, timeseries, topProperties, byCity, byUniversity } =
    await loadAnalytics(range);

  return (
    <div className="mx-auto max-w-5xl px-4 py-8 md:py-10">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="text-display text-3xl">Analytics</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Views and enquiries across the {RANGE_LABEL[range]}.
          </p>
        </div>
        <AnalyticsRangePicker />
      </div>

      <div className="mt-8 space-y-6">
        <AnalyticsStats summary={summary} />

        <Card>
          <CardHeader>
            <CardTitle>Views and enquiries over time</CardTitle>
          </CardHeader>
          <CardContent>
            <TrendChart data={timeseries} />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Top listings</CardTitle>
          </CardHeader>
          <CardContent>
            <TopPropertiesList properties={topProperties} />
          </CardContent>
        </Card>

        <div className="grid gap-6 lg:grid-cols-2">
          <Card>
            <CardHeader>
              <CardTitle>Views by city</CardTitle>
            </CardHeader>
            <CardContent>
              <BreakdownChart data={byCity} />
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Views by university</CardTitle>
            </CardHeader>
            <CardContent>
              <BreakdownChart data={byUniversity} />
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
