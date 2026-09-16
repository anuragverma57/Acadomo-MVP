import { describe, expect, it } from "vitest";

import { buildPropertyWhere } from "@/lib/db/queries";

/**
 * These tests guard the one place user input meets SQL. The rule they enforce:
 * a filter VALUE must never appear in the generated SQL string — only $n
 * placeholders — so injection is structurally impossible rather than filtered.
 */

describe("buildPropertyWhere", () => {
  it("produces no WHERE clause when there are no filters", () => {
    const { clause, params } = buildPropertyWhere({});
    expect(clause).toBe("");
    expect(params).toEqual([]);
  });

  it("numbers placeholders sequentially across combined filters", () => {
    const { clause, params } = buildPropertyWhere({
      city: "London",
      roomType: "studio",
      minPrice: 10000,
      maxPrice: 40000,
    });

    expect(clause).toContain("city = $1");
    expect(clause).toContain("room_type = $2");
    expect(clause).toContain("price_per_week >= $3");
    expect(clause).toContain("price_per_week <= $4");
    expect(params).toEqual(["London", "studio", 10000, 40000]);
  });

  it("joins multiple conditions with AND", () => {
    const { clause } = buildPropertyWhere({ city: "London", university: "UCL" });
    expect(clause).toMatch(/^WHERE .+ AND .+$/);
  });

  it("searches title, city and university from one parameter", () => {
    const { clause, params } = buildPropertyWhere({ q: "edinburgh" });

    expect(clause).toContain("title ILIKE");
    expect(clause).toContain("city ILIKE");
    expect(clause).toContain("university ILIKE");
    // One value, reused across three columns.
    expect(params).toEqual(["edinburgh"]);
  });

  it("honours a starting placeholder index", () => {
    const { clause } = buildPropertyWhere({ city: "London" }, 5);
    expect(clause).toContain("$5");
  });

  it("omits filters that are undefined", () => {
    const { clause, params } = buildPropertyWhere({
      city: "London",
      university: undefined,
      minPrice: undefined,
    });

    expect(clause).toBe("WHERE city = $1");
    expect(params).toEqual(["London"]);
  });

  it("treats minPrice of 0 as a real filter, not as absent", () => {
    // A falsy-check bug here would silently drop a legitimate £0 lower bound.
    const { clause, params } = buildPropertyWhere({ minPrice: 0 });
    expect(clause).toContain("price_per_week >= $1");
    expect(params).toEqual([0]);
  });

  describe("injection resistance", () => {
    const payloads = [
      "'; DROP TABLE properties; --",
      "' OR 1=1 --",
      "' UNION SELECT null, null --",
      "London'; DELETE FROM enquiries WHERE 'x'='x",
      "\\'; TRUNCATE students; --",
    ];

    it.each(payloads)("keeps payload %s out of the SQL string", (payload) => {
      const { clause, params } = buildPropertyWhere({
        q: payload,
        city: payload,
        university: payload,
      });

      // The value appears ONLY in params, never in the SQL text.
      expect(clause).not.toContain(payload);
      expect(clause).not.toMatch(/DROP|DELETE|TRUNCATE|UNION/i);
      expect(params).toEqual([payload, payload, payload]);
    });

    it("emits only placeholders, never quoted literals", () => {
      const { clause } = buildPropertyWhere({
        q: "test",
        city: "London",
        university: "UCL",
        roomType: "studio",
        minPrice: 100,
        maxPrice: 200,
      });

      // Every value position is a $n placeholder. The only quotes present are
      // the ILIKE wildcards ('%'), which are literals we control.
      const quoted = clause.replace(/'%'/g, "");
      expect(quoted).not.toContain("'");
    });
  });
});
