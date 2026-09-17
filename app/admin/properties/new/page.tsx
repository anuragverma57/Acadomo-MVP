import type { Metadata } from "next";
import { redirect } from "next/navigation";

import { PropertyForm } from "@/components/property-form";
import { getAdminSession } from "@/lib/auth";

export const metadata: Metadata = {
  title: "Add property",
  robots: { index: false, follow: false },
};

export default async function NewPropertyPage() {
  if (!(await getAdminSession())) redirect("/admin/login");

  return (
    <div className="mx-auto max-w-2xl px-4 py-8 md:py-10">
      <h1 className="text-display text-3xl">Add property</h1>
      <div className="mt-8">
        <PropertyForm />
      </div>
    </div>
  );
}
