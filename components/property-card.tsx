import Image from "next/image";
import Link from "next/link";
import { Eye, GraduationCap, Inbox, MapPin } from "lucide-react";

import { SaveButton } from "@/components/save-button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import type { Property } from "@/lib/db/queries";
import { formatPrice, roomTypeLabel } from "@/lib/format";

export type PropertyStats = { views: number; enquiries: number };

/** Same glass treatment as the room-type badge, so the card reads as one design. */
function StatPill({
  Icon,
  value,
  label,
}: {
  Icon: typeof Eye;
  value: number;
  label: string;
}) {
  return (
    <span
      className="flex items-center gap-1 rounded-md bg-background/90 px-2 py-1 text-xs font-medium tabular-nums backdrop-blur"
      title={`${value.toLocaleString()} ${label}`}
    >
      <Icon className="size-3.5 text-muted-foreground" aria-hidden />
      {value.toLocaleString()}
      <span className="sr-only">{label}</span>
    </span>
  );
}

export function PropertyCard({
  property,
  priority = false,
  saved = false,
  signedIn = false,
  stats,
}: {
  property: Property;
  priority?: boolean;
  saved?: boolean;
  signedIn?: boolean;
  /** Supplied for an admin viewing the public site: swaps the save affordance
   *  for the numbers they actually need. Saving a listing is a student action
   *  and means nothing on a staff account. */
  stats?: PropertyStats;
}) {
  return (
    <Card className="group overflow-hidden border-border p-0 shadow-none transition-all duration-200 focus-within:ring-2 focus-within:ring-ring/50 hover:-translate-y-0.5 hover:border-foreground/25">
      <Link href={`/properties/${property.slug}`} className="block outline-none">
        <div className="relative aspect-[4/3] overflow-hidden bg-muted">
          <Image
            src={property.imageUrl}
            alt={property.title}
            fill
            sizes="(min-width: 1024px) 33vw, (min-width: 640px) 50vw, 100vw"
            priority={priority}
            className="object-cover transition-transform duration-500 ease-out group-hover:scale-[1.04]"
          />
          <Badge
            variant="secondary"
            className="absolute left-3 top-3 bg-background/90 backdrop-blur"
          >
            {roomTypeLabel(property.roomType)}
          </Badge>
          {stats ? (
            <div className="absolute right-2 top-2 flex gap-1.5">
              <StatPill Icon={Eye} value={stats.views} label="views" />
              <StatPill Icon={Inbox} value={stats.enquiries} label="enquiries" />
            </div>
          ) : (
            <div className="absolute right-2 top-2">
              <SaveButton
                propertyId={property.id}
                initialSaved={saved}
                signedIn={signedIn}
              />
            </div>
          )}
        </div>

        <CardContent className="space-y-3 p-5">
          <div className="space-y-1.5">
            <h3 className="font-display line-clamp-1 text-base font-semibold tracking-tight">
              {property.title}
            </h3>
            <p className="flex items-center gap-1.5 text-sm text-muted-foreground">
              <MapPin className="size-3.5 shrink-0" aria-hidden />
              <span className="line-clamp-1">{property.city}</span>
            </p>
            <p className="flex items-center gap-1.5 text-sm text-muted-foreground">
              <GraduationCap className="size-3.5 shrink-0" aria-hidden />
              <span className="line-clamp-1">{property.university}</span>
            </p>
          </div>

          <p className="flex items-baseline gap-1 border-t border-border pt-3">
            <span className="font-display tabular text-xl font-bold tracking-tight">
              {formatPrice(property.pricePerWeek, property.currency)}
            </span>
            <span className="text-sm text-muted-foreground">/ week</span>
          </p>
        </CardContent>
      </Link>
    </Card>
  );
}

export function PropertyCardSkeleton() {
  return (
    <Card className="overflow-hidden p-0">
      <div className="aspect-[4/3] animate-pulse bg-muted" />
      <CardContent className="space-y-3 p-4">
        <div className="h-5 w-3/4 animate-pulse rounded bg-muted" />
        <div className="h-4 w-1/2 animate-pulse rounded bg-muted" />
        <div className="h-4 w-2/3 animate-pulse rounded bg-muted" />
        <div className="h-6 w-1/3 animate-pulse rounded bg-muted" />
      </CardContent>
    </Card>
  );
}
