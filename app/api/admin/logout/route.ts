import { ok, serverError } from "@/lib/api";
import { destroyAdminSession } from "@/lib/auth";

/** POST /api/admin/logout */
export async function POST() {
  try {
    await destroyAdminSession();
    return ok({ signedOut: true });
  } catch (error) {
    return serverError("POST /api/admin/logout", error);
  }
}
