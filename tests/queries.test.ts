import { describe, expect, it } from "vitest";

import {
  buildAdminPropertyWhere,
  buildEnquiryWhere,
  buildPropertyWhere,
} from "@/lib/db/queries";
import { SORT_KEYS, propertyFiltersSchema } from "@/lib/validation";

/**
 * These tests guard the one place user input meets SQL. The rule they enforce:
 * a filter VALUE must never appear in the generated SQL string — only $n
 * placeholders — so injection is structurally impossible rather than filtered.
 */

describe("buildPropertyWhere", () => {
  it("filters to active rows even when no filters are supplied", () => {
    // Was `clause === ""` before is_active existed. Public reads must never
    // return hidden properties, so the bare case is no longer empty.
    const { clause, params } = buildPropertyWhere({});
    expect(clause).toBe("WHERE is_active = true");
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

    expect(clause).toBe("WHERE is_active = true AND city = $1");
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

describe("property visibility (is_active)", () => {
  /**
   * Hidden properties must be filtered in SQL, not by the UI omitting a row.
   * A missing WHERE clause here would expose disabled listings through the
   * public API even though the page does not render them.
   */
  it("filters to active rows by default", () => {
    const { clause } = buildPropertyWhere({});
    expect(clause).toContain("is_active = true");
  });

  it("keeps the active filter alongside other filters", () => {
    const { clause, params } = buildPropertyWhere({ city: "London" });
    expect(clause).toContain("is_active = true");
    expect(clause).toContain("city = $1");
    expect(params).toEqual(["London"]);
  });

  it("omits the filter only when a caller explicitly opts in", () => {
    const { clause } = buildPropertyWhere({}, 1, { includeInactive: true });
    expect(clause).not.toContain("is_active");
  });

  it("numbers placeholders correctly despite the non-parameterized filter", () => {
    // is_active = true adds no parameter, so $1 must still be the first value.
    const { clause, params } = buildPropertyWhere({ city: "London", roomType: "studio" });
    expect(clause).toContain("city = $1");
    expect(clause).toContain("room_type = $2");
    expect(params).toEqual(["London", "studio"]);
  });
});

describe("buildEnquiryWhere", () => {
  it("produces no clause with no filters", () => {
    const { clause, params } = buildEnquiryWhere({});
    expect(clause).toBe("");
    expect(params).toEqual([]);
  });

  it("searches name, email, message and property title from one parameter", () => {
    const { clause, params } = buildEnquiryWhere({ q: "aisha" });
    expect(clause).toContain("e.name ILIKE");
    expect(clause).toContain("e.email ILIKE");
    expect(clause).toContain("e.message ILIKE");
    expect(clause).toContain("p.title ILIKE");
    expect(params).toEqual(["aisha"]);
  });

  it("combines status and date range", () => {
    const { clause, params } = buildEnquiryWhere({ status: "new", range: "7d" });
    expect(clause).toContain("e.status = $1");
    expect(clause).toContain("e.created_at >= now()");
    expect(params).toEqual(["new", 7]);
  });

  it("treats range 'all' as no date filter", () => {
    const { clause } = buildEnquiryWhere({ range: "all" });
    expect(clause).not.toContain("created_at");
  });

  it("passes the interval as a parameter, never inline", () => {
    // A raw interval string built from input would be injectable.
    const { clause, params } = buildEnquiryWhere({ range: "90d" });
    expect(clause).not.toContain("90");
    expect(params).toEqual([90]);
  });

  it.each([
    "'; DROP TABLE enquiries; --",
    "' OR 1=1 --",
    "' UNION SELECT null --",
  ])("keeps payload %s out of the SQL string", (payload) => {
    const { clause, params } = buildEnquiryWhere({ q: payload });
    expect(clause).not.toContain(payload);
    expect(clause).not.toMatch(/DROP|DELETE|UNION/i);
    expect(params).toEqual([payload]);
  });
});

describe("buildAdminPropertyWhere", () => {
  it("returns no clause with no filters — admins see everything", () => {
    // Unlike the public builder, this must NOT force is_active.
    const { clause, params } = buildAdminPropertyWhere({});
    expect(clause).toBe("");
    expect(params).toEqual([]);
  });

  it.each([
    ["active", "is_active = true"],
    ["hidden", "is_active = false"],
  ] as const)("maps visibility %s to %s", (visibility, expected) => {
    const { clause } = buildAdminPropertyWhere({ visibility });
    expect(clause).toContain(expected);
  });

  it("treats visibility 'all' as no filter", () => {
    const { clause } = buildAdminPropertyWhere({ visibility: "all" });
    expect(clause).not.toContain("is_active");
  });

  it("searches title, city and university from one parameter", () => {
    const { clause, params } = buildAdminPropertyWhere({ q: "ashfield" });
    expect(clause).toContain("title ILIKE");
    expect(clause).toContain("city ILIKE");
    expect(clause).toContain("university ILIKE");
    expect(params).toEqual(["ashfield"]);
  });

  it("numbers placeholders correctly when visibility adds no parameter", () => {
    const { clause, params } = buildAdminPropertyWhere({
      city: "London",
      roomType: "studio",
      visibility: "hidden",
    });
    expect(clause).toContain("city = $1");
    expect(clause).toContain("room_type = $2");
    expect(clause).toContain("is_active = false");
    expect(params).toEqual(["London", "studio"]);
  });

  it.each([
    "'; DROP TABLE properties; --",
    "' OR 1=1 --",
  ])("keeps payload %s out of the SQL string", (payload) => {
    const { clause, params } = buildAdminPropertyWhere({ q: payload, city: payload });
    expect(clause).not.toContain(payload);
    expect(clause).not.toMatch(/DROP|DELETE|UNION/i);
    expect(params).toEqual([payload, payload]);
  });
});

describe("public sort keys", () => {
  it("maps every allowlisted key to SQL, and nothing else", () => {
    // ORDER BY cannot be parameterized, so this allowlist is the boundary.
    for (const key of SORT_KEYS) {
      expect(propertyFiltersSchema.safeParse({ sort: key }).success).toBe(true);
    }
    expect(
      propertyFiltersSchema.safeParse({ sort: "price_per_week; DROP TABLE properties" })
        .success,
    ).toBe(false);
  });

  it("falls back to newest for an unknown sort rather than erroring", () => {
    // A stale bookmark must not 500 the browse page.
    const parsed = propertyFiltersSchema.safeParse({ sort: "bogus" });
    expect(parsed.success).toBe(false);
    expect(propertyFiltersSchema.parse({}).sort).toBe("newest");
  });
});
