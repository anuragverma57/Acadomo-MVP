import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { Inbox } from "lucide-react";

import { StudentSignOut } from "@/components/student-sign-out";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { listEnquiriesForStudent } from "@/lib/db/queries";
import { currentStudent } from "@/lib/session";

export const metadata: Metadata = {
  title: "Your account",
  robots: { index: false, follow: false },
};

function formatDate(value: Date | string) {
  return new Intl.DateTimeFormat("en-GB", {
    day: "numeric",
    month: "short",
    year: "numeric",
  }).format(new Date(value));
}

export default async function AccountPage() {
  const student = await currentStudent();
  if (!student) {
    redirect("/signup?next=%2Faccount");
  }

  const enquiries = await listEnquiriesForStudent(student.id);

  return (
    <div className="mx-auto max-w-3xl px-4 py-8 md:py-12">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-display text-3xl">Your account</h1>
          <p className="mt-1 text-sm text-muted-foreground">{student.email}</p>
        </div>
        <StudentSignOut />
      </div>

      <section className="mt-10">
        <h2 className="font-display text-lg font-semibold">Your enquiries</h2>

        {enquiries.length === 0 ? (
          <div className="mt-4 flex flex-col items-center rounded-lg border border-dashed border-border py-14 text-center">
            <div className="rounded-full bg-muted p-3">
              <Inbox className="size-5 text-muted-foreground" aria-hidden />
            </div>
            <p className="mt-4 text-sm text-muted-foreground text-pretty">
              Enquiries you send will be listed here with their status.
            </p>
            <Button render={<Link href="/" />} variant="outline" className="mt-5">
              Browse properties
            </Button>
          </div>
        ) : (
          <ul className="mt-4 space-y-3">
            {enquiries.map((enquiry) => (
              <li
                key={enquiry.id}
                className="rounded-lg border border-border p-4"
              >
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <Link
                    href={`/properties/${enquiry.propertySlug}`}
                    className="font-medium underline-offset-4 hover:underline"
                  >
                    {enquiry.propertyTitle}
                  </Link>
                  {enquiry.status === "contacted" ? (
                    <Badge variant="secondary">Contacted</Badge>
                  ) : (
                    <Badge>Awaiting reply</Badge>
                  )}
                </div>
                <p className="mt-2 text-sm text-muted-foreground">
                  {enquiry.message}
                </p>
                <p className="mt-3 text-xs text-muted-foreground">
                  Sent {formatDate(enquiry.createdAt)}
                </p>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
