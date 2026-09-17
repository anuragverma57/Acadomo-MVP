import type { Metadata } from "next";
import { notFound, redirect } from "next/navigation";

import { PropertyForm } from "@/components/property-form";
import { getAdminSession } from "@/lib/auth";
import { findPropertyById } from "@/lib/services/admin-properties";

export const metadata: Metadata = {
  title: "Edit property",
  robots: { index: false, follow: false },
};

export default async function EditPropertyPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  if (!(await getAdminSession())) redirect("/admin/login");

  const { id } = await params;
  const propertyId = Number(id);
  if (!Number.isInteger(propertyId)) notFound();

  const property = await findPropertyById(propertyId);
  if (!property) notFound();

  return (
    <div className="mx-auto max-w-2xl px-4 py-8 md:py-10">
      <h1 className="text-display text-3xl">Edit property</h1>
      <p className="mt-1 text-sm text-muted-foreground">{property.slug}</p>
      <div className="mt-8">
        <PropertyForm property={property} />
      </div>
    </div>
  );
}
