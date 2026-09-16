import { randomInt } from "node:crypto";
import bcrypt from "bcryptjs";

import {
  burnOtp,
  consumeOtpAndUpsertStudent,
  createOtpCode,
  findLiveOtp,
  incrementOtpAttempts,
  type Student,
} from "@/lib/db/queries";
import { sendOtpEmail } from "@/lib/services/email";
import { rateLimit } from "@/lib/services/rate-limit";

/**
 * Passwordless sign-in via one-time code.
 *
 * OTP codes ARE credentials, so they follow credential rules: generated with a
 * CSPRNG, stored hashed, short-lived, attempt-capped and single-use
 * (CLAUDE.md §3). A shortcut on any one of these makes the flow a liability.
 */

const CODE_LENGTH = 6;
const TTL_MINUTES = 10;
const MAX_ATTEMPTS = 5;

const SEND_LIMIT = 3;
const SEND_WINDOW_MS = 60 * 60_000; // 1 hour

// bcrypt cost for codes. Lower than a password's 12 on purpose: a 6-digit code
// lives for 10 minutes with a 5-attempt cap, so its security comes from those
// limits, not from hash cost — and verify runs on every attempt.
const CODE_HASH_ROUNDS = 10;

export type RequestOtpResult =
  | { ok: true }
  | { ok: false; reason: "throttled"; retryAfterSeconds: number };

export type VerifyOtpResult =
  | { ok: true; student: Student }
  | { ok: false; reason: "invalid" | "expired" | "too_many_attempts" };

/** Cryptographically secure 6-digit code. Math.random is not acceptable here. */
function generateCode(): string {
  return String(randomInt(0, 10 ** CODE_LENGTH)).padStart(CODE_LENGTH, "0");
}

/**
 * Issues a code and emails it.
 *
 * The caller must return an identical response regardless of outcome (beyond
 * throttling), so an attacker cannot learn which emails have accounts.
 */
export async function requestOtp(
  email: string,
  ip: string,
): Promise<RequestOtpResult> {
  // Two independent throttles: per email stops targeting one inbox; per IP
  // stops using the endpoint as a bulk spam relay.
  const byEmail = rateLimit(`otp-email:${email}`, SEND_LIMIT, SEND_WINDOW_MS);
  if (!byEmail.allowed) {
    return {
      ok: false,
      reason: "throttled",
      retryAfterSeconds: byEmail.retryAfterSeconds,
    };
  }

  const byIp = rateLimit(`otp-ip:${ip}`, SEND_LIMIT * 3, SEND_WINDOW_MS);
  if (!byIp.allowed) {
    return {
      ok: false,
      reason: "throttled",
      retryAfterSeconds: byIp.retryAfterSeconds,
    };
  }

  const code = generateCode();
  const codeHash = await bcrypt.hash(code, CODE_HASH_ROUNDS);
  const expiresAt = new Date(Date.now() + TTL_MINUTES * 60_000);

  // Invalidates older live codes for this email in the same transaction.
  await createOtpCode(email, codeHash, expiresAt);

  await sendOtpEmail(email, code, TTL_MINUTES);

  return { ok: true };
}

/**
 * Verifies a submitted code and, on success, consumes it while creating the
 * student — both inside one transaction, so a spent code always yields an
 * account and a code can never be redeemed twice.
 */
export async function verifyOtp(
  email: string,
  code: string,
): Promise<VerifyOtpResult> {
  const record = await findLiveOtp(email);

  // No live code: either never requested, already used, or expired. The SQL
  // enforces expiry, so this branch covers all three without leaking which.
  if (!record) {
    return { ok: false, reason: "expired" };
  }

  if (record.attempts >= MAX_ATTEMPTS) {
    await burnOtp(record.id);
    return { ok: false, reason: "too_many_attempts" };
  }

  const valid = await bcrypt.compare(code, record.codeHash);

  if (!valid) {
    const attempts = await incrementOtpAttempts(record.id);
    if (attempts >= MAX_ATTEMPTS) {
      // Burn on the final failure so the code cannot be tried again.
      await burnOtp(record.id);
      return { ok: false, reason: "too_many_attempts" };
    }
    return { ok: false, reason: "invalid" };
  }

  const student = await consumeOtpAndUpsertStudent(record.id, email);

  // A concurrent request consumed it first.
  if (!student) {
    return { ok: false, reason: "expired" };
  }

  return { ok: true, student };
}
