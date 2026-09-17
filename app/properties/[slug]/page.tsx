import type { Metadata } from "next";
import { headers } from "next/headers";
import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, Check, Eye, GraduationCap, Inbox, MapPin } from "lucide-react";

import { EnquiryForm } from "@/components/enquiry-form";
import { SaveButton } from "@/components/save-button";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { findLatestEnquiryForStudent, getPropertyStats } from "@/lib/db/queries";
import { getAdminSession } from "@/lib/auth";
import { currentStudentWithSaved } from "@/lib/session";
import { findPropertyBySlug } from "@/lib/services/properties";
import { trackPropertyView } from "@/lib/services/views";
import { formatPrice, roomTypeLabel } from "@/lib/format";

type Props = {
  params: Promise<{ slug: string }>;
};

/** Per-property SEO + Open Graph. The JD names SEO; this is the cheap 80%. */
export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const property = await findPropertyBySlug(slug);

  if (!property) {
    return { title: "Property not found" };
  }

  const title = `${property.title} — ${property.city}`;
  const description = `${roomTypeLabel(property.roomType)} near ${property.university}, ${property.city}. From ${formatPrice(property.pricePerWeek, property.currency)} per week.`;

  return {
    title,
    description,
    alternates: { canonical: `/properties/${property.slug}` },
    openGraph: {
      title,
      description,
      type: "website",
      images: [{ url: property.imageUrl, alt: property.title }],
    },
  };
}

/**
 * Reads the request headers and records the view.
 *
 * `headers()` opts this route into dynamic rendering, which is correct here:
 * a page that counts its own views cannot be served from a static cache, or
 * the count would only ever reach one.
 */
async function recordView(propertyId: number) {
  const h = await headers();
  await trackPropertyView(
    propertyId,
    h.get("x-forwarded-for")?.split(",")[0]?.trim() ?? h.get("x-real-ip"),
    h.get("user-agent"),
  );
}

export default async function PropertyDetailPage({ params }: Props) {
  const { slug } = await params;
  const [property, { student, savedIds }] = await Promise.all([
    findPropertyBySlug(slug),
    currentStudentWithSaved(),
  ]);

  if (!property) {
    notFound();
  }

  // Recorded after the not-found check so a probe for a non-existent slug
  // cannot write rows. Deliberately NOT awaited: the view is a side effect of
  // the page, and making the student wait on an analytics insert would trade
  // their time for our metric. trackPropertyView swallows its own errors.
  void recordView(property.id);

  // Scoped to the session's student id, never an email from the request, so
  // this cannot be used to probe someone else's enquiry history.
  const previousEnquiry = student
    ? await findLatestEnquiryForStudent(student.id, property.id)
    : null;

  // Staff viewing the public site get this listing's numbers instead of an
  // enquiry form — an admin enquiring with themselves is not a real action,
  // and it would pollute the very metrics they are here to read.
  const adminSession = await getAdminSession();
  const stats = adminSession
    ? ((await getPropertyStats([property.id])).get(property.id) ?? {
        views: 0,
        enquiries: 0,
      })
    : null;

  return (
    <div className="mx-auto max-w-6xl px-4 py-6 md:py-10">
      {/* Standalone PWA has no browser chrome, so every deep page needs its own
          back affordance (CLAUDE.md §5a). */}
      <Link
        href="/"
        className="inline-flex min-h-11 items-center gap-1.5 text-sm text-muted-foreground transition-colors hover:text-foreground"
      >
        <ArrowLeft className="size-4" aria-hidden />
        Back to listings
      </Link>

      <div className="mt-4 overflow-hidden rounded-xl bg-muted">
        <div className="relative aspect-[16/10] md:aspect-[21/9]">
          <Image
            src={property.imageUrl}
            alt={property.title}
            fill
            sizes="(min-width: 1280px) 1152px, 100vw"
            priority
            className="object-cover"
          />
        </div>
      </div>

      <div className="mt-8 grid gap-10 lg:grid-cols-[1fr_380px]">
        <div>
          <Badge variant="secondary">{roomTypeLabel(property.roomType)}</Badge>

          <h1 className="text-display mt-3 text-3xl text-balance md:text-4xl">
            {property.title}
          </h1>

          <div className="mt-3 flex flex-wrap gap-x-5 gap-y-2 text-sm text-muted-foreground">
            <span className="flex items-center gap-1.5">
              <MapPin className="size-4 shrink-0" aria-hidden />
              {property.city}, {property.country}
            </span>
            <span className="flex items-center gap-1.5">
              <GraduationCap className="size-4 shrink-0" aria-hidden />
              {property.university}
            </span>
          </div>

          <p className="mt-6 text-2xl font-semibold">
            {formatPrice(property.pricePerWeek, property.currency)}
            <span className="text-base font-normal text-muted-foreground">
              {" "}
              / week
            </span>
          </p>

          <Separator className="my-8" />

          <section>
            <h2 className="font-display text-lg font-semibold">About this property</h2>
            <p className="mt-3 leading-relaxed text-muted-foreground text-pretty">
              {property.description}
            </p>
          </section>

          {property.amenities.length > 0 ? (
            <section className="mt-8">
              <h2 className="font-display text-lg font-semibold">What&apos;s included</h2>
              <ul className="mt-4 grid gap-2.5 sm:grid-cols-2">
                {property.amenities.map((amenity) => (
                  <li key={amenity} className="flex items-center gap-2.5 text-sm">
                    <Check className="size-4 shrink-0 text-primary" aria-hidden />
                    {amenity}
                  </li>
                ))}
              </ul>
            </section>
          ) : null}
        </div>

        <aside className="lg:sticky lg:top-20 lg:self-start">
          <div className="rounded-xl border border-border p-5">
            {stats ? (
              <>
                <h2 className="font-display text-lg font-semibold">
                  Listing performance
                </h2>
                <p className="mt-1 text-sm text-muted-foreground">
                  All time, across every visitor.
                </p>
                <dl className="mt-5 grid grid-cols-2 gap-3">
                  <div className="rounded-lg border border-border p-4">
                    <dt className="flex items-center gap-1.5 text-xs font-medium tracking-wide text-muted-foreground uppercase">
                      <Eye className="size-3.5" aria-hidden />
                      Views
                    </dt>
                    <dd className="font-display mt-1 text-2xl tabular-nums">
                      {stats.views.toLocaleString()}
                    </dd>
                  </div>
                  <div className="rounded-lg border border-border p-4">
                    <dt className="flex items-center gap-1.5 text-xs font-medium tracking-wide text-muted-foreground uppercase">
                      <Inbox className="size-3.5" aria-hidden />
                      Enquiries
                    </dt>
                    <dd className="font-display mt-1 text-2xl tabular-nums">
                      {stats.enquiries.toLocaleString()}
                    </dd>
                  </div>
                </dl>
                <p className="mt-3 text-sm text-muted-foreground">
                  {stats.views > 0
                    ? `${Math.round((stats.enquiries / stats.views) * 1000) / 10}% of views became an enquiry.`
                    : "No views recorded yet."}
                </p>
                <Button
                  render={<Link href="/admin/analytics" />}
                  variant="outline"
                  className="mt-5 w-full"
                >
                  View all analytics
                </Button>
              </>
            ) : (
              <>
                {/* The heading follows the state below it — inviting an enquiry
                    directly above "you have already enquired" reads as a bug. */}
                <h2 className="font-display text-lg font-semibold">
                  {previousEnquiry ? "Your enquiry" : "Enquire about this property"}
                </h2>
                <p className="mt-1 text-sm text-muted-foreground">
                  {previousEnquiry
                    ? "The team replies by email, usually within a couple of days."
                    : "Send a message and the team will get back to you by email."}
                </p>
                <div className="mt-5 space-y-4">
                  <SaveButton
                    propertyId={property.id}
                    initialSaved={savedIds.has(property.id)}
                    signedIn={Boolean(student)}
                    variant="full"
                  />
                  <EnquiryForm
                    propertyId={property.id}
                    propertyTitle={property.title}
                    defaultName={student?.name ?? ""}
                    defaultEmail={student?.email ?? ""}
                    defaultPhone={student?.phone ?? ""}
                    previousEnquiry={previousEnquiry}
                  />
                </div>
              </>
            )}
          </div>
        </aside>
      </div>
    </div>
  );
}
