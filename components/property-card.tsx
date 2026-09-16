import Image from "next/image";
import Link from "next/link";
import { GraduationCap, MapPin } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import type { Property } from "@/lib/db/queries";
import { formatPrice, roomTypeLabel } from "@/lib/format";

export function PropertyCard({
  property,
  priority = false,
}: {
  property: Property;
  priority?: boolean;
}) {
  return (
    <Card className="group overflow-hidden p-0 transition-shadow focus-within:ring-2 focus-within:ring-ring/50 hover:shadow-md">
      <Link href={`/properties/${property.slug}`} className="block outline-none">
        <div className="relative aspect-[4/3] overflow-hidden bg-muted">
          <Image
            src={property.imageUrl}
            alt={property.title}
            fill
            sizes="(min-width: 1024px) 33vw, (min-width: 640px) 50vw, 100vw"
            priority={priority}
            className="object-cover transition-transform duration-300 group-hover:scale-105"
          />
          <Badge
            variant="secondary"
            className="absolute left-3 top-3 bg-background/90 backdrop-blur"
          >
            {roomTypeLabel(property.roomType)}
          </Badge>
        </div>

        <CardContent className="space-y-3 p-4">
          <div className="space-y-1">
            <h3 className="line-clamp-1 font-semibold tracking-tight">
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

          <p className="pt-1">
            <span className="text-lg font-semibold">
              {formatPrice(property.pricePerWeek, property.currency)}
            </span>
            <span className="text-sm text-muted-foreground"> / week</span>
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
