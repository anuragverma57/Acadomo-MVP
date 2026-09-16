import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { Heart } from "lucide-react";

import { PropertyCard } from "@/components/property-card";
import { Button } from "@/components/ui/button";
import { listSavedProperties } from "@/lib/db/queries";
import { currentStudent } from "@/lib/session";

export const metadata: Metadata = {
  title: "Saved properties",
  robots: { index: false, follow: false },
};

export default async function SavedPage() {
  const student = await currentStudent();
  if (!student) {
    redirect("/signup?next=%2Fsaved");
  }

  // Scoped by the session's student id in SQL — never by a client value.
  const properties = await listSavedProperties(student.id);

  return (
    <div className="mx-auto max-w-6xl px-4 py-8 md:py-12">
      <h1 className="text-display text-3xl md:text-4xl">
        Your shortlist
      </h1>
      <p className="mt-1.5 text-sm text-muted-foreground">
        {properties.length === 0
          ? "Properties you save will appear here."
          : `${properties.length} ${properties.length === 1 ? "property" : "properties"} saved.`}
      </p>

      {properties.length === 0 ? (
        <div className="mt-8 flex flex-col items-center rounded-lg border border-dashed border-border py-16 text-center">
          <div className="rounded-full bg-muted p-3">
            <Heart className="size-6 text-muted-foreground" aria-hidden />
          </div>
          <h2 className="font-display mt-4 text-lg font-semibold">No saved properties yet</h2>
          <p className="mt-1 max-w-sm text-sm text-muted-foreground text-pretty">
            Tap the heart on any property to add it to your shortlist and compare
            later.
          </p>
          <Button render={<Link href="/" />} className="mt-6">
            Browse properties
          </Button>
        </div>
      ) : (
        <div className="mt-8 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {properties.map((property) => (
            <PropertyCard
              key={property.id}
              property={property}
              saved
              signedIn
            />
          ))}
        </div>
      )}
    </div>
  );
}
