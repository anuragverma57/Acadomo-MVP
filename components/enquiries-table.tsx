"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { toast } from "sonner";
import { Check, Loader2, Mail, Phone, Undo2 } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import type { Enquiry } from "@/lib/db/queries";
import type { EnquiryStatus } from "@/lib/validation";

function formatDate(value: Date | string) {
  return new Intl.DateTimeFormat("en-GB", {
    day: "numeric",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(value));
}

/**
 * Enquiry list.
 *
 * Deliberately NOT an HTML table. Six columns of variable-length content
 * (message, email, property title) cannot fit any viewport without horizontal
 * scrolling, which is what made the previous version feel broken. A card
 * layout reflows instead, and reads identically at 375px and on desktop.
 */
export function EnquiriesList({ enquiries }: { enquiries: Enquiry[] }) {
  const router = useRouter();
  const [pendingId, setPendingId] = useState<number | null>(null);
  const [, startTransition] = useTransition();

  async function setStatus(id: number, status: EnquiryStatus) {
    setPendingId(id);
    try {
      const response = await fetch(`/api/admin/enquiries/${id}`, {
        method: "PATCH",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ status }),
      });

      if (!response.ok) {
        toast.error("Couldn't update that enquiry.");
        return;
      }

      toast.success(status === "contacted" ? "Marked as contacted" : "Moved back to new");
      startTransition(() => router.refresh());
    } catch {
      toast.error("Couldn't reach the server.");
    } finally {
      setPendingId(null);
    }
  }

  if (enquiries.length === 0) {
    return (
      <div className="rounded-lg border border-dashed border-border py-16 text-center">
        <h2 className="font-semibold">No enquiries match</h2>
        <p className="mt-1 text-sm text-muted-foreground">
          Try a different search, status or date range.
        </p>
      </div>
    );
  }

  return (
    <ul className="space-y-3">
      {enquiries.map((enquiry) => {
        const pending = pendingId === enquiry.id;
        const next: EnquiryStatus = enquiry.status === "new" ? "contacted" : "new";

        return (
          <li
            key={enquiry.id}
            className="rounded-lg border border-border p-4 transition-colors hover:border-foreground/20"
          >
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div className="min-w-0">
                <p className="font-medium">{enquiry.name}</p>
                <Link
                  href={`/properties/${enquiry.propertySlug}`}
                  className="text-sm text-muted-foreground underline-offset-4 hover:text-foreground hover:underline"
                >
                  {enquiry.propertyTitle}
                </Link>
              </div>

              <div className="flex shrink-0 items-center gap-2">
                {enquiry.status === "contacted" ? (
                  <Badge variant="secondary">Contacted</Badge>
                ) : (
                  <Badge>New</Badge>
                )}
              </div>
            </div>

            <p className="mt-3 text-sm text-muted-foreground">{enquiry.message}</p>

            <div className="mt-4 flex flex-wrap items-center gap-x-5 gap-y-2 text-sm">
              <a
                href={`mailto:${enquiry.email}`}
                className="flex min-h-11 items-center gap-1.5 text-muted-foreground underline-offset-4 hover:text-foreground hover:underline md:min-h-0"
              >
                <Mail className="size-3.5 shrink-0" aria-hidden />
                <span className="truncate">{enquiry.email}</span>
              </a>
              <a
                href={`tel:${enquiry.phone}`}
                className="flex min-h-11 items-center gap-1.5 text-muted-foreground underline-offset-4 hover:text-foreground hover:underline md:min-h-0"
              >
                <Phone className="size-3.5 shrink-0" aria-hidden />
                {enquiry.phone}
              </a>
            </div>

            <div className="mt-4 flex flex-wrap items-center justify-between gap-3 border-t border-border pt-3">
              <span className="text-xs text-muted-foreground tabular">
                {formatDate(enquiry.createdAt)}
              </span>
              <Button
                variant={enquiry.status === "new" ? "default" : "outline"}
                size="sm"
                disabled={pending}
                onClick={() => setStatus(enquiry.id, next)}
                className="gap-1.5"
              >
                {pending ? (
                  <Loader2 className="size-3.5 animate-spin" aria-hidden />
                ) : enquiry.status === "new" ? (
                  <Check className="size-3.5" aria-hidden />
                ) : (
                  <Undo2 className="size-3.5" aria-hidden />
                )}
                {enquiry.status === "new" ? "Mark contacted" : "Mark new"}
              </Button>
            </div>
          </li>
        );
      })}
    </ul>
  );
}
