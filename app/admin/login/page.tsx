import type { Metadata } from "next";
import { redirect } from "next/navigation";

import { AdminLoginForm } from "@/components/admin-login-form";
import { getAdminSession } from "@/lib/auth";

export const metadata: Metadata = {
  title: "Admin sign in",
  robots: { index: false, follow: false },
};

export default async function AdminLoginPage() {
  // Already signed in — skip the form.
  const session = await getAdminSession();
  if (session) {
    redirect("/admin");
  }

  return (
    <div className="mx-auto flex min-h-[70vh] max-w-sm flex-col justify-center px-4 py-12">
      <h1 className="text-2xl font-semibold tracking-tight">Admin sign in</h1>
      <p className="mt-1.5 text-sm text-muted-foreground">
        Manage student enquiries for AcaDomo.
      </p>
      <div className="mt-8">
        <AdminLoginForm />
      </div>
    </div>
  );
}
