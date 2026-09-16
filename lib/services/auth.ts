import { findAdminByEmail } from "@/lib/db/queries";
import { verifyPassword } from "@/lib/auth";

/**
 * Authentication rules. Services take plain values and return plain data —
 * cookie handling stays in the route handler (CLAUDE.md §2a).
 */

export type AuthenticateResult =
  | { ok: true; userId: number; email: string; role: string }
  | { ok: false };

/**
 * Verifies admin credentials.
 *
 * Returns the same shapeless failure whether the email is unknown or the
 * password is wrong, and always runs a bcrypt comparison so response time does
 * not reveal which case occurred (no user enumeration).
 */
export async function authenticateAdmin(
  email: string,
  password: string,
): Promise<AuthenticateResult> {
  const admin = await findAdminByEmail(email);

  // Dummy hash of a random value — cost 12, same work as a real comparison.
  const hash =
    admin?.passwordHash ??
    "$2b$12$C6UzMDM.H6dfI/f/IKcEe.Bq0vXBEo/Xk8jL3Q8YQzXsN4M1eZ8Iu";

  const valid = await verifyPassword(password, hash);

  if (!admin || !valid) {
    return { ok: false };
  }

  return {
    ok: true,
    userId: admin.id,
    email: admin.email,
    role: admin.role,
  };
}
