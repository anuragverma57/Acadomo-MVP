import { cookies } from "next/headers";
import { SignJWT, jwtVerify } from "jose";
import bcrypt from "bcryptjs";

/**
 * Session handling for two separate realms.
 *
 * Admin and student sessions use different cookie names AND carry a `realm`
 * claim. Verifying only the signature would let a student token satisfy an
 * admin check — the realm must be asserted explicitly (CLAUDE.md §3).
 */

export const ADMIN_COOKIE = "acadomo_admin_session";
export const STUDENT_COOKIE = "acadomo_student_session";

const ADMIN_MAX_AGE_SECONDS = 2 * 60 * 60; // 2 hours
const STUDENT_MAX_AGE_SECONDS = 30 * 24 * 60 * 60; // 30 days

export type Realm = "admin" | "student";

export type AdminSession = {
  realm: "admin";
  userId: number;
  email: string;
  role: string;
};

export type StudentSession = {
  realm: "student";
  studentId: number;
  email: string;
};

function secret(): Uint8Array {
  const value = process.env.JWT_SECRET;

  if (!value || value.length < 32) {
    // Failing loudly beats signing tokens with a weak or missing key.
    throw new Error(
      "JWT_SECRET is missing or too short (need at least 32 characters).",
    );
  }

  return new TextEncoder().encode(value);
}

export function hashPassword(password: string): Promise<string> {
  return bcrypt.hash(password, 12);
}

export function verifyPassword(
  password: string,
  hash: string,
): Promise<boolean> {
  return bcrypt.compare(password, hash);
}

async function signToken(
  payload: Record<string, unknown>,
  maxAgeSeconds: number,
): Promise<string> {
  return new SignJWT(payload)
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime(`${maxAgeSeconds}s`)
    .sign(secret());
}

function cookieOptions(maxAgeSeconds: number) {
  return {
    httpOnly: true,
    // Secure in production only — localhost is served over plain HTTP.
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax" as const,
    path: "/",
    maxAge: maxAgeSeconds,
  };
}

// ---------------------------------------------------------------------------
// Admin
// ---------------------------------------------------------------------------

export async function createAdminSession(session: {
  userId: number;
  email: string;
  role: string;
}): Promise<void> {
  const token = await signToken(
    { realm: "admin", ...session },
    ADMIN_MAX_AGE_SECONDS,
  );
  const store = await cookies();
  store.set(ADMIN_COOKIE, token, cookieOptions(ADMIN_MAX_AGE_SECONDS));
}

export async function getAdminSession(): Promise<AdminSession | null> {
  const store = await cookies();
  const token = store.get(ADMIN_COOKIE)?.value;
  if (!token) return null;

  try {
    const { payload } = await jwtVerify(token, secret());

    // A valid signature is not enough: assert the realm.
    if (payload.realm !== "admin") return null;
    if (typeof payload.userId !== "number") return null;

    return {
      realm: "admin",
      userId: payload.userId,
      email: String(payload.email),
      role: String(payload.role),
    };
  } catch {
    // Expired or tampered token — treat as signed out.
    return null;
  }
}

export async function destroyAdminSession(): Promise<void> {
  const store = await cookies();
  store.delete(ADMIN_COOKIE);
}

// ---------------------------------------------------------------------------
// Student (used from Phase 5.5)
// ---------------------------------------------------------------------------

export async function createStudentSession(session: {
  studentId: number;
  email: string;
}): Promise<void> {
  const token = await signToken(
    { realm: "student", ...session },
    STUDENT_MAX_AGE_SECONDS,
  );
  const store = await cookies();
  store.set(STUDENT_COOKIE, token, cookieOptions(STUDENT_MAX_AGE_SECONDS));
}

export async function getStudentSession(): Promise<StudentSession | null> {
  const store = await cookies();
  const token = store.get(STUDENT_COOKIE)?.value;
  if (!token) return null;

  try {
    const { payload } = await jwtVerify(token, secret());

    if (payload.realm !== "student") return null;
    if (typeof payload.studentId !== "number") return null;

    return {
      realm: "student",
      studentId: payload.studentId,
      email: String(payload.email),
    };
  } catch {
    return null;
  }
}

export async function destroyStudentSession(): Promise<void> {
  const store = await cookies();
  store.delete(STUDENT_COOKIE);
}
