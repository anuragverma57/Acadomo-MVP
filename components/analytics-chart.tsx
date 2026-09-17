"use client";

import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

import type { Breakdown, TimeseriesPoint } from "@/lib/db/queries";

/**
 * Charts read their colours from the CSS custom properties, so a theme change
 * repaints them with no JS involved — no theme listener, no re-render, and no
 * flash of the wrong palette on load.
 */
const SERIES = {
  views: "var(--chart-2)",
  enquiries: "var(--chart-1)",
} as const;

const AXIS_STYLE = {
  fontSize: 11,
  fill: "var(--muted-foreground)",
} as const;

function formatDay(iso: string) {
  const date = new Date(`${iso}T00:00:00`);
  return date.toLocaleDateString("en-GB", { day: "numeric", month: "short" });
}

function TooltipBox({
  active,
  payload,
  label,
}: {
  active?: boolean;
  payload?: Array<{ name?: string; value?: number; color?: string }>;
  label?: string | number;
}) {
  if (!active || !payload?.length) return null;

  return (
    <div className="rounded-lg border border-border bg-popover px-3 py-2 text-xs shadow-md">
      <p className="font-medium text-popover-foreground">
        {typeof label === "string" && /^\d{4}-\d{2}-\d{2}$/.test(label)
          ? formatDay(label)
          : label}
      </p>
      <ul className="mt-1 space-y-0.5">
        {payload.map((entry) => (
          <li key={entry.name} className="flex items-center gap-2">
            <span
              aria-hidden
              className="size-2 rounded-full"
              style={{ background: entry.color }}
            />
            <span className="text-muted-foreground capitalize">{entry.name}</span>
            <span className="ml-auto font-medium tabular-nums text-popover-foreground">
              {entry.value?.toLocaleString()}
            </span>
          </li>
        ))}
      </ul>
    </div>
  );
}

/**
 * Views and enquiries over time on a shared x-axis.
 *
 * Two y-axes, because views outnumber enquiries by ~50x — on one axis the
 * enquiry line would be flat against zero and unreadable.
 */
export function TrendChart({ data }: { data: TimeseriesPoint[] }) {
  // Thin the tick labels on long ranges so they cannot collide on a phone.
  const tickStep = Math.max(1, Math.ceil(data.length / 6));

  return (
    <div className="h-[260px] w-full">
      <ResponsiveContainer width="100%" height="100%">
        {/* A negative left margin pulls the y-axis outside the plot area and
            clips its tick labels; the right margin has to clear half the last
            x-tick, which is otherwise cut off at the edge. */}
        <AreaChart data={data} margin={{ top: 8, right: 16, bottom: 0, left: 0 }}>
          <defs>
            {/* stop-color is an SVG presentation attribute and does NOT resolve
                a CSS custom property in Chrome or Safari — var(--chart-2) here
                silently falls back to transparent black and the fill vanishes.
                Setting it through CSS (where var() does resolve) is what makes
                these gradients theme-aware. */}
            <linearGradient id="fill-views" x1="0" y1="0" x2="0" y2="1">
              <stop className="[stop-color:var(--chart-2)]" offset="0%" stopOpacity={0.28} />
              <stop className="[stop-color:var(--chart-2)]" offset="100%" stopOpacity={0.02} />
            </linearGradient>
            <linearGradient id="fill-enquiries" x1="0" y1="0" x2="0" y2="1">
              <stop className="[stop-color:var(--chart-1)]" offset="0%" stopOpacity={0.3} />
              <stop className="[stop-color:var(--chart-1)]" offset="100%" stopOpacity={0.02} />
            </linearGradient>
          </defs>

          <CartesianGrid
            vertical={false}
            stroke="var(--border)"
            strokeDasharray="3 3"
          />
          <XAxis
            dataKey="day"
            tickLine={false}
            axisLine={false}
            tick={AXIS_STYLE}
            interval={tickStep - 1}
            tickFormatter={formatDay}
            // Without this the first and last labels overhang the plot area
            // and get clipped by the container.
            padding={{ left: 8, right: 8 }}
            tickMargin={8}
          />
          <YAxis
            yAxisId="views"
            tickLine={false}
            axisLine={false}
            tick={AXIS_STYLE}
            // Wide enough for a five-figure view count without clipping.
            width={52}
            tickFormatter={(value: number) =>
              value >= 1000 ? `${Math.round(value / 100) / 10}k` : String(value)
            }
          />
          <YAxis yAxisId="enquiries" orientation="right" hide />
          <Tooltip content={<TooltipBox />} cursor={{ stroke: "var(--border)" }} />

          <Area
            yAxisId="views"
            type="monotone"
            dataKey="views"
            name="views"
            stroke={SERIES.views}
            strokeWidth={2}
            fill="url(#fill-views)"
          />
          <Area
            yAxisId="enquiries"
            type="monotone"
            dataKey="enquiries"
            name="enquiries"
            stroke={SERIES.enquiries}
            strokeWidth={2}
            fill="url(#fill-enquiries)"
          />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}

/**
 * Shortens the long-but-predictable university names so a label fits on one
 * line. "University of Birmingham" wrapped to two lines and still clipped.
 */
function shortenLabel(label: string) {
  return label
    .replace(/^University of /, "")
    .replace(/ University$/, "")
    .replace(/^The /, "");
}

/** Horizontal bars — city and university names are too long to sit under vertical ones. */
export function BreakdownChart({ data }: { data: Breakdown[] }) {
  return (
    <div style={{ height: Math.max(150, data.length * 40) }} className="w-full">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart
          data={data}
          layout="vertical"
          margin={{ top: 4, right: 20, bottom: 4, left: 0 }}
        >
          <CartesianGrid
            horizontal={false}
            stroke="var(--border)"
            strokeDasharray="3 3"
          />
          <XAxis type="number" tickLine={false} axisLine={false} tick={AXIS_STYLE} />
          <YAxis
            type="category"
            dataKey="label"
            tickLine={false}
            axisLine={false}
            tick={AXIS_STYLE}
            // Wide enough for a shortened name on one line at 375px.
            width={96}
            tickMargin={6}
            tickFormatter={shortenLabel}
          />
          <Tooltip content={<TooltipBox />} cursor={{ fill: "var(--muted)" }} />
          <Bar dataKey="views" name="views" radius={[0, 4, 4, 0]}>
            {data.map((entry) => (
              <Cell key={entry.label} fill={SERIES.views} />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
