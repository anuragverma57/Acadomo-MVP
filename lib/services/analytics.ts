import {
  getAnalyticsSummary,
  getAnalyticsTimeseries,
  getBreakdown,
  getTopProperties,
  type AnalyticsSummary,
  type Breakdown,
  type TimeseriesPoint,
  type TopProperty,
} from "@/lib/db/queries";
import type { AnalyticsRange } from "@/lib/validation";

export type AnalyticsDashboard = {
  summary: AnalyticsSummary;
  timeseries: TimeseriesPoint[];
  topProperties: TopProperty[];
  byCity: Breakdown[];
  byUniversity: Breakdown[];
};

/**
 * Loads everything the dashboard renders.
 *
 * The five queries are independent, so they run concurrently — sequentially
 * this would be five round trips to a pooler in another region, which is the
 * dominant cost on a page like this.
 */
export async function loadAnalytics(
  range: AnalyticsRange,
): Promise<AnalyticsDashboard> {
  const [summary, timeseries, topProperties, byCity, byUniversity] =
    await Promise.all([
      getAnalyticsSummary(range),
      getAnalyticsTimeseries(range),
      getTopProperties(range),
      getBreakdown("city", range),
      getBreakdown("university", range),
    ]);

  return { summary, timeseries, topProperties, byCity, byUniversity };
}
