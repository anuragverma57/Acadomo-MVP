import { createHash } from "node:crypto";

import { recordPropertyView } from "@/lib/db/queries";

/**
 * Identifies a visitor well enough to deduplicate repeat views, without
 * storing anything that identifies a person.
 *
 * The IP and user agent are salted and hashed one-way, so the stored value
 * cannot be reversed into an IP. The salt matters: the IPv4 space is small
 * enough to brute-force a bare SHA-256 of every address in minutes, which
 * would make an unsalted hash equivalent to storing the address itself.
 */
function visitorHash(ip: string, userAgent: string): string {
  const salt = process.env.VIEW_HASH_SALT ?? "acadomo-dev-salt";
  return createHash("sha256").update(`${salt}:${ip}:${userAgent}`).digest("hex");
}

/**
 * Records a property view. Never throws: analytics is a side effect of
 * rendering a page, and a failure to count a view must not take the page down
 * for the student trying to read it.
 */
export async function trackPropertyView(
  propertyId: number,
  ip: string | null,
  userAgent: string | null,
): Promise<void> {
  try {
    await recordPropertyView(
      propertyId,
      visitorHash(ip ?? "unknown", userAgent ?? "unknown"),
    );
  } catch (error) {
    console.error("Failed to record property view", error);
  }
}
