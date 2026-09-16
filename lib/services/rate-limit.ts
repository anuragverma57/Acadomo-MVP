/**
 * In-memory fixed-window rate limiter.
 *
 * Deliberately simple: this MVP runs as a single instance, so a shared store
 * (Redis/Upstash) would be infrastructure for no benefit. The trade-off is
 * real and stated in the README — on multi-instance deploys each instance
 * keeps its own counter, and counters reset on cold start. Swapping in a
 * shared store means replacing this one file.
 */

type Window = { count: number; resetAt: number };

const windows = new Map<string, Window>();

// Bound the map so a flood of unique keys cannot grow it without limit.
const MAX_KEYS = 10_000;

function sweep(now: number) {
  for (const [key, window] of windows) {
    if (window.resetAt <= now) windows.delete(key);
  }
}

export type RateLimitResult = {
  allowed: boolean;
  remaining: number;
  retryAfterSeconds: number;
};

export function rateLimit(
  key: string,
  limit: number,
  windowMs: number,
): RateLimitResult {
  const now = Date.now();
  const existing = windows.get(key);

  if (!existing || existing.resetAt <= now) {
    if (windows.size >= MAX_KEYS) sweep(now);
    windows.set(key, { count: 1, resetAt: now + windowMs });
    return { allowed: true, remaining: limit - 1, retryAfterSeconds: 0 };
  }

  if (existing.count >= limit) {
    return {
      allowed: false,
      remaining: 0,
      retryAfterSeconds: Math.max(1, Math.ceil((existing.resetAt - now) / 1000)),
    };
  }

  existing.count += 1;
  return {
    allowed: true,
    remaining: limit - existing.count,
    retryAfterSeconds: 0,
  };
}

/** Test seam — not used in application code. */
export function __resetRateLimits() {
  windows.clear();
}
