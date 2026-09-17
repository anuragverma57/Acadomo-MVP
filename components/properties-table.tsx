"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { toast } from "sonner";
import { Pencil } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import type { Property } from "@/lib/db/queries";
import { formatPrice, roomTypeLabel } from "@/lib/format";

export function PropertiesTable({ properties }: { properties: Property[] }) {
  const router = useRouter();
  const [pendingId, setPendingId] = useState<number | null>(null);

  async function toggle(id: number, isActive: boolean) {
    setPendingId(id);
    try {
      const response = await fetch(`/api/admin/properties/${id}`, {
        method: "PATCH",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ isActive }),
      });

      if (!response.ok) {
        toast.error("Couldn't update visibility.");
        return;
      }

      toast.success(isActive ? "Visible to students" : "Hidden from students");
      router.refresh();
    } catch {
      toast.error("Couldn't reach the server.");
    } finally {
      setPendingId(null);
    }
  }

  if (properties.length === 0) {
    return (
      <div className="rounded-lg border border-dashed border-border py-16 text-center">
        <h2 className="font-semibold">No properties yet</h2>
        <p className="mt-1 text-sm text-muted-foreground">
          Add your first listing to get started.
        </p>
      </div>
    );
  }

  return (
    <ul className="space-y-3">
      {properties.map((property) => (
        <li
          key={property.id}
          className="flex flex-wrap items-center gap-4 rounded-lg border border-border p-4"
        >
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-2">
              <p className="font-medium">{property.title}</p>
              {!property.isActive ? (
                <Badge variant="secondary">Hidden</Badge>
              ) : null}
            </div>
            <p className="mt-0.5 text-sm text-muted-foreground">
              {property.city} · {property.university} ·{" "}
              {roomTypeLabel(property.roomType)} ·{" "}
              <span className="tabular">
                {formatPrice(property.pricePerWeek, property.currency)}
              </span>
              /wk
            </p>
          </div>

          <div className="flex items-center gap-3">
            <Switch
              checked={property.isActive}
              disabled={pendingId === property.id}
              onCheckedChange={(checked) => toggle(property.id, Boolean(checked))}
              aria-label={`${property.isActive ? "Hide" : "Show"} ${property.title}`}
            />
            <Button
              render={<Link href={`/admin/properties/${property.id}`} />}
              variant="outline"
              size="sm"
              className="gap-1.5"
            >
              <Pencil className="size-3.5" aria-hidden />
              Edit
            </Button>
          </div>
        </li>
      ))}
    </ul>
  );
}
