import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import bcrypt from "bcryptjs";

/**
 * The highest-value tests in the suite. OTP codes are credentials, so these
 * assert the four properties that make the flow safe:
 *   hashed at rest · expiring · attempt-capped · single-use
 *
 * The database and email layers are mocked so these test the SERVICE LOGIC,
 * not Postgres. An in-memory fake stands in for the tables.
 */

type FakeOtp = {
  id: number;
  email: string;
  codeHash: string;
  expiresAt: Date;
  attempts: number;
  consumedAt: Date | null;
};

const store = {
  codes: [] as FakeOtp[],
  nextId: 1,
  sentCodes: [] as { to: string; code: string }[],
};

vi.mock("@/lib/db/queries", () => ({
  createOtpCode: vi.fn(async (email: string, codeHash: string, expiresAt: Date) => {
    // Mirrors the real query: invalidate live codes, then insert.
    for (const code of store.codes) {
      if (code.email === email && code.consumedAt === null) {
        code.consumedAt = new Date();
      }
    }
    store.codes.push({
      id: store.nextId++,
      email,
      codeHash,
      expiresAt,
      attempts: 0,
      consumedAt: null,
    });
  }),

  findLiveOtp: vi.fn(async (email: string) => {
    // Expiry is enforced here, exactly as the SQL WHERE clause does.
    const live = store.codes
      .filter(
        (c) =>
          c.email === email &&
          c.consumedAt === null &&
          c.expiresAt.getTime() > Date.now(),
      )
      .at(-1);

    return live
      ? { id: live.id, codeHash: live.codeHash, attempts: live.attempts }
      : null;
  }),

  incrementOtpAttempts: vi.fn(async (id: number) => {
    const code = store.codes.find((c) => c.id === id)!;
    code.attempts += 1;
    return code.attempts;
  }),

  burnOtp: vi.fn(async (id: number) => {
    const code = store.codes.find((c) => c.id === id)!;
    code.consumedAt = new Date();
  }),

  consumeOtpAndUpsertStudent: vi.fn(async (otpId: number, email: string) => {
    const code = store.codes.find((c) => c.id === otpId)!;
    if (code.consumedAt !== null) return null; // Already spent.
    code.consumedAt = new Date();
    return { id: 1, email, name: null, emailVerifiedAt: new Date() };
  }),
}));

vi.mock("@/lib/services/email", () => ({
  sendOtpEmail: vi.fn(async (to: string, code: string) => {
    store.sentCodes.push({ to, code });
  }),
}));

const { requestOtp, verifyOtp, isDemoOtpEnabled } = await import("@/lib/services/otp");
const { __resetRateLimits } = await import("@/lib/services/rate-limit");

const EMAIL = "student@example.com";
const IP = "203.0.113.1";

/** The plaintext code is only ever visible via the mocked email sender. */
function lastSentCode() {
  return store.sentCodes.at(-1)!.code;
}

beforeEach(() => {
  store.codes = [];
  store.nextId = 1;
  store.sentCodes = [];
  __resetRateLimits();
});

describe("requestOtp", () => {
  it("issues a 6-digit numeric code", async () => {
    await requestOtp(EMAIL, IP);
    expect(lastSentCode()).toMatch(/^\d{6}$/);
  });

  it("stores the code hashed, never in plaintext", async () => {
    await requestOtp(EMAIL, IP);

    const stored = store.codes.at(-1)!;
    const plaintext = lastSentCode();

    expect(stored.codeHash).not.toBe(plaintext);
    expect(stored.codeHash).toMatch(/^\$2[aby]\$/);
    expect(await bcrypt.compare(plaintext, stored.codeHash)).toBe(true);
  });

  it("sets an expiry in the future", async () => {
    await requestOtp(EMAIL, IP);
    expect(store.codes.at(-1)!.expiresAt.getTime()).toBeGreaterThan(Date.now());
  });

  it("invalidates the previous code when a new one is requested", async () => {
    await requestOtp(EMAIL, IP);
    const first = lastSentCode();

    await requestOtp(EMAIL, IP);

    // The older code must no longer work.
    const result = await verifyOtp(EMAIL, first);
    expect(result.ok).toBe(false);
  });

  it("throttles after 3 sends to the same email", async () => {
    for (let i = 0; i < 3; i++) {
      expect((await requestOtp(EMAIL, IP)).ok).toBe(true);
    }

    const fourth = await requestOtp(EMAIL, IP);
    expect(fourth.ok).toBe(false);
    expect(fourth.ok === false && fourth.reason).toBe("throttled");
  });

  it("generates different codes across requests", async () => {
    // A constant code would mean a broken CSPRNG.
    const codes = new Set<string>();
    for (let i = 0; i < 3; i++) {
      __resetRateLimits();
      await requestOtp(`user${i}@example.com`, IP);
      codes.add(lastSentCode());
    }
    expect(codes.size).toBeGreaterThan(1);
  });
});

describe("verifyOtp", () => {
  it("accepts the correct code", async () => {
    await requestOtp(EMAIL, IP);
    const result = await verifyOtp(EMAIL, lastSentCode());

    expect(result.ok).toBe(true);
    expect(result.ok && result.student.email).toBe(EMAIL);
  });

  it("rejects an incorrect code", async () => {
    await requestOtp(EMAIL, IP);
    const result = await verifyOtp(EMAIL, "000000");

    expect(result.ok).toBe(false);
    expect(result.ok === false && result.reason).toBe("invalid");
  });

  it("rejects a code for an email that never requested one", async () => {
    const result = await verifyOtp("nobody@example.com", "123456");
    expect(result.ok).toBe(false);
    expect(result.ok === false && result.reason).toBe("expired");
  });

  it("rejects an expired code", async () => {
    await requestOtp(EMAIL, IP);
    const code = lastSentCode();

    // Move expiry into the past, as the SQL WHERE clause would see it.
    store.codes.at(-1)!.expiresAt = new Date(Date.now() - 1000);

    const result = await verifyOtp(EMAIL, code);
    expect(result.ok).toBe(false);
    expect(result.ok === false && result.reason).toBe("expired");
  });

  it("cannot be reused once consumed", async () => {
    await requestOtp(EMAIL, IP);
    const code = lastSentCode();

    expect((await verifyOtp(EMAIL, code)).ok).toBe(true);

    const replay = await verifyOtp(EMAIL, code);
    expect(replay.ok).toBe(false);
  });

  describe("attempt cap", () => {
    it("locks out after 5 wrong attempts", async () => {
      await requestOtp(EMAIL, IP);

      const reasons: string[] = [];
      for (let i = 0; i < 5; i++) {
        const r = await verifyOtp(EMAIL, "000000");
        reasons.push(r.ok === false ? r.reason : "ok");
      }

      expect(reasons).toEqual([
        "invalid",
        "invalid",
        "invalid",
        "invalid",
        "too_many_attempts",
      ]);
    });

    it("rejects the CORRECT code after lockout", async () => {
      await requestOtp(EMAIL, IP);
      const code = lastSentCode();

      for (let i = 0; i < 5; i++) {
        await verifyOtp(EMAIL, "000000");
      }

      // This is the property that matters: brute force burns the code, so a
      // later attacker with the real code still gets nothing.
      const result = await verifyOtp(EMAIL, code);
      expect(result.ok).toBe(false);
    });

    it("burns the code on the final failed attempt", async () => {
      await requestOtp(EMAIL, IP);

      for (let i = 0; i < 5; i++) {
        await verifyOtp(EMAIL, "000000");
      }

      expect(store.codes.at(-1)!.consumedAt).not.toBeNull();
    });
  });
});

describe("demo mode gating", () => {
  /**
   * Demo mode returns the OTP to the client. That is account takeover if it is
   * ever on in a real deployment, so these assert it stays off unless very
   * explicitly enabled — and that it can never coexist with real email.
   */
  const original = {
    demo: process.env.NEXT_PUBLIC_DEMO_OTP,
    key: process.env.RESEND_API_KEY,
  };

  afterEach(() => {
    process.env.NEXT_PUBLIC_DEMO_OTP = original.demo;
    process.env.RESEND_API_KEY = original.key;
  });

  function withEnv(demo?: string, key?: string) {
    delete process.env.NEXT_PUBLIC_DEMO_OTP;
    delete process.env.RESEND_API_KEY;
    if (demo !== undefined) process.env.NEXT_PUBLIC_DEMO_OTP = demo;
    if (key !== undefined) process.env.RESEND_API_KEY = key;
    return isDemoOtpEnabled();
  }

  it("is off when nothing is set", () => {
    expect(withEnv()).toBe(false);
  });

  it("is on only for the exact value '1' with no email provider", () => {
    expect(withEnv("1")).toBe(true);
  });

  it("is off once real email is configured, even with the flag on", () => {
    expect(withEnv("1", "re_live_key")).toBe(false);
  });

  it.each(["0", "true", "yes", ""])("is off for ambiguous value %s", (value) => {
    expect(withEnv(value)).toBe(false);
  });

  it("omits demoCode from the result when disabled", async () => {
    withEnv();
    const result = await requestOtp("gated@example.com", IP);
    expect(result.ok).toBe(true);
    expect(result.ok && result.demoCode).toBeUndefined();
  });
});
