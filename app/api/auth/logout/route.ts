import { ok, serverError } from "@/lib/api";
import { destroyStudentSession } from "@/lib/auth";

/** POST /api/auth/logout */
export async function POST() {
  try {
    await destroyStudentSession();
    return ok({ signedOut: true });
  } catch (error) {
    return serverError("POST /api/auth/logout", error);
  }
}
