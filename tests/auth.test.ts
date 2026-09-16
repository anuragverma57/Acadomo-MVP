import { beforeEach, describe, expect, it } from "vitest";
import bcrypt from "bcryptjs";

import { __resetRateLimits, rateLimit } from "@/lib/services/rate-limit";

describe("password hashing", () => {
  it("round-trips a correct password", async () => {
    const hash = await bcrypt.hash("correct-horse-battery", 12);
    expect(await bcrypt.compare("correct-horse-battery", hash)).toBe(true);
  });

  it("rejects an incorrect password", async () => {
    const hash = await bcrypt.hash("correct-horse-battery", 12);
    expect(await bcrypt.compare("wrong-password", hash)).toBe(false);
  });

  it("never stores the plaintext password", async () => {
    const password = "correct-horse-battery";
    const hash = await bcrypt.hash(password, 12);
    expect(hash).not.toContain(password);
  });

  it("uses cost 12 and produces a distinct hash per call (unique salt)", async () => {
    const a = await bcrypt.hash("same-password", 12);
    const b = await bcrypt.hash("same-password", 12);

    expect(a).toMatch(/^\$2[aby]\$12\$/);
    expect(a).not.toBe(b);
    // Both still verify — the difference is salt, not content.
    expect(await bcrypt.compare("same-password", a)).toBe(true);
    expect(await bcrypt.compare("same-password", b)).toBe(true);
  });
});

describe("rateLimit", () => {
  beforeEach(() => __resetRateLimits());

  it("allows requests up to the limit then blocks", () => {
    const results = Array.from({ length: 4 }, () =>
      rateLimit("key", 3, 60_000),
    );

    expect(results.map((r) => r.allowed)).toEqual([true, true, true, false]);
  });

  it("reports remaining allowance", () => {
    expect(rateLimit("key", 3, 60_000).remaining).toBe(2);
    expect(rateLimit("key", 3, 60_000).remaining).toBe(1);
    expect(rateLimit("key", 3, 60_000).remaining).toBe(0);
  });

  it("tracks keys independently", () => {
    rateLimit("a", 1, 60_000);
    // 'a' is now exhausted; 'b' must be unaffected.
    expect(rateLimit("a", 1, 60_000).allowed).toBe(false);
    expect(rateLimit("b", 1, 60_000).allowed).toBe(true);
  });

  it("returns a positive retry-after once blocked", () => {
    rateLimit("key", 1, 60_000);
    const blocked = rateLimit("key", 1, 60_000);

    expect(blocked.allowed).toBe(false);
    expect(blocked.retryAfterSeconds).toBeGreaterThan(0);
  });

  it("starts a fresh window after expiry", async () => {
    expect(rateLimit("key", 1, 30).allowed).toBe(true);
    expect(rateLimit("key", 1, 30).allowed).toBe(false);

    await new Promise((resolve) => setTimeout(resolve, 40));

    expect(rateLimit("key", 1, 30).allowed).toBe(true);
  });
});
