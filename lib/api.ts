import { NextResponse } from "next/server";
import { z } from "zod";

import { fieldErrors } from "@/lib/validation";

/**
 * Consistent response shapes for every route handler. Clients get a generic
 * message; details go to the server log only (CLAUDE.md §3).
 */

export function ok<T>(data: T, init?: ResponseInit) {
  return NextResponse.json(data, init);
}

export function badRequest(message: string, fields?: Record<string, string>) {
  return NextResponse.json({ error: message, fields }, { status: 400 });
}

export function validationFailed(error: z.ZodError) {
  return badRequest("Please check the highlighted fields", fieldErrors(error));
}

export function unauthorized(message = "Not authenticated") {
  return NextResponse.json({ error: message }, { status: 401 });
}

export function notFound(message = "Not found") {
  return NextResponse.json({ error: message }, { status: 404 });
}

export function tooManyRequests(retryAfterSeconds: number) {
  return NextResponse.json(
    { error: "Too many requests. Please try again shortly." },
    { status: 429, headers: { "Retry-After": String(retryAfterSeconds) } },
  );
}

/**
 * Logs the real error server-side and returns an opaque message. Never let a
 * stack trace, SQL string, or driver error reach the client.
 */
export function serverError(context: string, error: unknown) {
  console.error(`[${context}]`, error);
  return NextResponse.json(
    { error: "Something went wrong. Please try again." },
    { status: 500 },
  );
}

/** Best-effort client IP for rate limiting, behind Vercel's proxy headers. */
export function clientIp(request: Request): string {
  const forwarded = request.headers.get("x-forwarded-for");
  if (forwarded) return forwarded.split(",")[0]!.trim();
  return request.headers.get("x-real-ip")?.trim() || "unknown";
}
