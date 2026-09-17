import { describe, expect, it, vi, beforeEach } from "vitest";

import { analyticsFiltersSchema, ANALYTICS_RANGES } from "@/lib/validation";

/**
 * The analytics queries are the only place in the app where an IDENTIFIER
 * (a column name) reaches the SQL text, because Postgres cannot parameterize
 * one. These tests prove that path is closed: the dimension is resolved
 * through an allowlist, and every VALUE still travels as a $n parameter.
 */

const calls: Array<{ text: string; params: readonly unknown[] }> = [];

vi.mock("@/lib/db/client", () => ({
  query: vi.fn(async (text: string, params: readonly unknown[] = []) => {
    calls.push({ text, params });
    return [];
  }),
  queryOne: vi.fn(async (text: string, params: readonly unknown[] = []) => {
    calls.push({ text, params });
    return null;
  }),
  transaction: vi.fn(),
}));

const {
  getAnalyticsSummary,
  getAnalyticsTimeseries,
  getBreakdown,
  getTopProperties,
  recordPropertyView,
} = await import("@/lib/db/queries");

beforeEach(() => {
  calls.length = 0;
});

describe("analytics range handling", () => {
  it("defaults to a bounded 30-day window", () => {
    expect(analyticsFiltersSchema.parse({}).range).toBe("30d");
  });

  it("rejects a range outside the allowlist", () => {
    // A rejected value can never reach ANALYTICS_RANGE_DAYS, so the interval
    // is always built from an integer we chose.
    expect(analyticsFiltersSchema.safeParse({ range: "all" }).success).toBe(false);
    expect(analyticsFiltersSchema.safeParse({ range: "1 year" }).success).toBe(false);
    expect(
      analyticsFiltersSchema.safeParse({ range: "30d; DROP TABLE properties" })
        .success,
    ).toBe(false);
  });

  it.each(ANALYTICS_RANGES)("passes %s to SQL as a numeric parameter", async (range) => {
    await getAnalyticsTimeseries(range);

    const [call] = calls;
    expect(call).toBeDefined();
    // The day count is a parameter, never spliced into the interval literal.
    expect(call!.params[0]).toBeTypeOf("number");
    expect(call!.text).not.toContain(range);
  });
});

describe("getBreakdown", () => {
  it.each([
    ["city", "p.city"],
    ["university", "p.university"],
    ["roomType", "p.room_type"],
  ] as const)("maps %s to the allowlisted column %s", async (dimension, column) => {
    await getBreakdown(dimension, "30d");

    const [call] = calls;
    expect(call!.text).toContain(`${column} AS label`);
    expect(call!.text).toContain(`GROUP BY ${column}`);
  });

  it("cannot be steered to an arbitrary column", async () => {
    // Anything not in the allowlist resolves to undefined and throws before a
    // statement is built — the injection never reaches the database.
    await expect(
      // @ts-expect-error — proving the runtime guard, not the type
      getBreakdown("password_hash", "30d"),
    ).rejects.toThrow();

    await expect(
      // @ts-expect-error — proving the runtime guard, not the type
      getBreakdown("p.city FROM properties; DROP TABLE properties --", "30d"),
    ).rejects.toThrow();

    expect(calls).toHaveLength(0);
  });
});

describe("getTopProperties", () => {
  it("parameterizes both the window and the limit", async () => {
    await getTopProperties("90d", 5);

    const [call] = calls;
    expect(call!.params).toEqual([90, 5]);
    expect(call!.text).toContain("LIMIT $2");
  });

  it("aggregates each side separately so the join cannot inflate counts", async () => {
    // A property with 40 views and 3 enquiries would otherwise produce 120
    // rows, multiplying both totals. Each CTE collapses to one row per property.
    await getTopProperties("30d");

    const { text } = calls[0]!;
    expect(text).toContain("GROUP BY property_id");
    expect(text.match(/GROUP BY property_id/g)).toHaveLength(2);
  });
});

describe("getAnalyticsSummary", () => {
  it("derives both windows from a single parameter", async () => {
    await getAnalyticsSummary("7d");

    const [call] = calls;
    expect(call!.params).toEqual([7]);
    // Current and previous windows come from the same value, so they cannot
    // drift apart the way two separate queries could.
    expect(call!.text).toContain("$1::int * 2");
  });
});

describe("recordPropertyView", () => {
  it("guards the insert against a repeat view in one statement", async () => {
    await recordPropertyView(12, "a".repeat(64));

    const [call] = calls;
    expect(call!.text).toContain("NOT EXISTS");
    // Checking then inserting as two statements could interleave; this cannot.
    expect(call!.text).toContain("INSERT INTO property_views");
    expect(call!.params).toEqual([12, "a".repeat(64), 30]);
  });

  it("never stores a raw identifier in the SQL text", async () => {
    await recordPropertyView(7, "deadbeef".repeat(8));

    const { text, params } = calls[0]!;
    expect(text).not.toContain("deadbeef");
    expect(params).toContain("deadbeef".repeat(8));
  });
});

describe("visitor hashing", () => {
  it("never stores anything reversible to an IP", async () => {
    vi.stubEnv("VIEW_HASH_SALT", "test-salt");
    const { trackPropertyView } = await import("@/lib/services/views");

    const ip = "203.0.113.42";
    await trackPropertyView(5, ip, "Mozilla/5.0");

    const { text, params } = calls[0]!;
    const stored = params[1] as string;

    expect(text).not.toContain(ip);
    expect(stored).not.toContain(ip);
    expect(stored).toMatch(/^[0-9a-f]{64}$/);

    vi.unstubAllEnvs();
  });

  it("gives the same visitor a stable hash and different visitors different ones", async () => {
    vi.stubEnv("VIEW_HASH_SALT", "test-salt");
    const { trackPropertyView } = await import("@/lib/services/views");

    await trackPropertyView(1, "198.51.100.1", "UA-A");
    await trackPropertyView(1, "198.51.100.1", "UA-A");
    await trackPropertyView(1, "198.51.100.2", "UA-A");

    const [a, b, c] = calls.map((call) => call.params[1]);
    // Stable, so a refresh deduplicates; distinct, so two people both count.
    expect(a).toBe(b);
    expect(a).not.toBe(c);

    vi.unstubAllEnvs();
  });

  it("swallows a database failure rather than breaking the page", async () => {
    const client = await import("@/lib/db/client");
    vi.mocked(client.query).mockRejectedValueOnce(new Error("connection lost"));
    const consoleError = vi.spyOn(console, "error").mockImplementation(() => {});

    const { trackPropertyView } = await import("@/lib/services/views");

    // A student reading a listing must not see an error because analytics failed.
    await expect(trackPropertyView(1, "203.0.113.9", "UA")).resolves.toBeUndefined();
    expect(consoleError).toHaveBeenCalled();

    consoleError.mockRestore();
  });
});

describe("getPropertyStats", () => {
  it("passes ids as ONE array parameter, not a variable placeholder list", async () => {
    const { getPropertyStats } = await import("@/lib/db/queries");
    await getPropertyStats([1, 2, 3]);

    const [call] = calls;
    // Building `IN ($1,$2,$3)` would make the query's SHAPE depend on input.
    expect(call!.params).toEqual([[1, 2, 3]]);
    expect(call!.text).toContain("$1::bigint[]");
    expect(call!.text).not.toContain("$2");
  });

  it("short-circuits on an empty list without touching the database", async () => {
    const { getPropertyStats } = await import("@/lib/db/queries");
    const result = await getPropertyStats([]);

    expect(result.size).toBe(0);
    expect(calls).toHaveLength(0);
  });

  it("counts each side separately so the join cannot inflate them", async () => {
    const { getPropertyStats } = await import("@/lib/db/queries");
    await getPropertyStats([7]);

    const { text } = calls[0]!;
    expect(text.match(/GROUP BY property_id/g)).toHaveLength(2);
  });
});

describe("findLatestEnquiryForStudent", () => {
  it("scopes to the student id so one account cannot probe another's history", async () => {
    const { findLatestEnquiryForStudent } = await import("@/lib/db/queries");
    await findLatestEnquiryForStudent(42, 7);

    const [call] = calls;
    expect(call!.text).toContain("student_id = $1");
    expect(call!.params).toEqual([42, 7]);
  });
});
