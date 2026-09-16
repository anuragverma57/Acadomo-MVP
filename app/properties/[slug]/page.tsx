import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, Check, GraduationCap, MapPin } from "lucide-react";

import { EnquiryForm } from "@/components/enquiry-form";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { findPropertyBySlug } from "@/lib/services/properties";
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

export default async function PropertyDetailPage({ params }: Props) {
  const { slug } = await params;
  const property = await findPropertyBySlug(slug);

  if (!property) {
    notFound();
  }

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

          <h1 className="mt-3 text-3xl font-semibold tracking-tight text-balance md:text-4xl">
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
            <h2 className="font-semibold">About this property</h2>
            <p className="mt-3 leading-relaxed text-muted-foreground text-pretty">
              {property.description}
            </p>
          </section>

          {property.amenities.length > 0 ? (
            <section className="mt-8">
              <h2 className="font-semibold">What&apos;s included</h2>
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
            <h2 className="font-semibold">Enquire about this property</h2>
            <p className="mt-1 text-sm text-muted-foreground">
              Send a message and the team will get back to you by email.
            </p>
            <div className="mt-5">
              <EnquiryForm
                propertyId={property.id}
                propertyTitle={property.title}
              />
            </div>
          </div>
        </aside>
      </div>
    </div>
  );
}
