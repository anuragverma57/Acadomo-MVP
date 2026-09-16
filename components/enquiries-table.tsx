"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { toast } from "sonner";
import { Check, Loader2, Undo2 } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import type { Enquiry } from "@/lib/db/queries";
import type { EnquiryStatus } from "@/lib/validation";

function formatDate(value: Date | string) {
  return new Intl.DateTimeFormat("en-GB", {
    day: "numeric",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(value));
}

function StatusBadge({ status }: { status: EnquiryStatus }) {
  return status === "contacted" ? (
    <Badge variant="secondary">Contacted</Badge>
  ) : (
    <Badge>New</Badge>
  );
}

export function EnquiriesTable({ enquiries }: { enquiries: Enquiry[] }) {
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
        toast.error("Couldn't update that enquiry. Please try again.");
        return;
      }

      toast.success(
        status === "contacted" ? "Marked as contacted" : "Moved back to new",
      );
      startTransition(() => router.refresh());
    } catch {
      toast.error("Couldn't reach the server. Check your connection.");
    } finally {
      setPendingId(null);
    }
  }

  if (enquiries.length === 0) {
    return (
      <div className="rounded-lg border border-dashed border-border py-16 text-center">
        <h2 className="font-semibold">No enquiries here</h2>
        <p className="mt-1 text-sm text-muted-foreground">
          New student enquiries will appear in this table.
        </p>
      </div>
    );
  }

  return (
    <>
      {/* Desktop: table. Tables cannot be made to work at 375px, so mobile
          gets a card list instead of a horizontally scrolling table. */}
      <div className="hidden overflow-hidden rounded-lg border border-border md:block">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Received</TableHead>
              <TableHead>Student</TableHead>
              <TableHead>Property</TableHead>
              <TableHead>Message</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="text-right">Action</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {enquiries.map((enquiry) => (
              <TableRow key={enquiry.id}>
                <TableCell className="whitespace-nowrap text-muted-foreground">
                  {formatDate(enquiry.createdAt)}
                </TableCell>
                <TableCell>
                  <div className="font-medium">{enquiry.name}</div>
                  <a
                    href={`mailto:${enquiry.email}`}
                    className="text-sm text-muted-foreground underline-offset-4 hover:underline"
                  >
                    {enquiry.email}
                  </a>
                  <div className="text-sm text-muted-foreground">
                    {enquiry.phone}
                  </div>
                </TableCell>
                <TableCell>
                  <Link
                    href={`/properties/${enquiry.propertySlug}`}
                    className="underline-offset-4 hover:underline"
                  >
                    {enquiry.propertyTitle}
                  </Link>
                </TableCell>
                <TableCell className="max-w-xs">
                  <p className="line-clamp-2 text-sm text-muted-foreground">
                    {enquiry.message}
                  </p>
                </TableCell>
                <TableCell>
                  <StatusBadge status={enquiry.status} />
                </TableCell>
                <TableCell className="text-right">
                  <StatusAction
                    enquiry={enquiry}
                    pending={pendingId === enquiry.id}
                    onChange={setStatus}
                  />
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      <div className="space-y-3 md:hidden">
        {enquiries.map((enquiry) => (
          <div
            key={enquiry.id}
            className="rounded-lg border border-border p-4"
          >
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="font-medium">{enquiry.name}</p>
                <a
                  href={`mailto:${enquiry.email}`}
                  className="text-sm text-muted-foreground underline-offset-4 hover:underline"
                >
                  {enquiry.email}
                </a>
              </div>
              <StatusBadge status={enquiry.status} />
            </div>

            <Link
              href={`/properties/${enquiry.propertySlug}`}
              className="mt-3 block text-sm underline-offset-4 hover:underline"
            >
              {enquiry.propertyTitle}
            </Link>

            <p className="mt-2 text-sm text-muted-foreground">
              {enquiry.message}
            </p>

            <div className="mt-4 flex items-center justify-between gap-3">
              <span className="text-xs text-muted-foreground">
                {formatDate(enquiry.createdAt)}
              </span>
              <StatusAction
                enquiry={enquiry}
                pending={pendingId === enquiry.id}
                onChange={setStatus}
              />
            </div>
          </div>
        ))}
      </div>
    </>
  );
}

function StatusAction({
  enquiry,
  pending,
  onChange,
}: {
  enquiry: Enquiry;
  pending: boolean;
  onChange: (id: number, status: EnquiryStatus) => void;
}) {
  const next: EnquiryStatus = enquiry.status === "new" ? "contacted" : "new";

  return (
    <Button
      variant={enquiry.status === "new" ? "default" : "outline"}
      size="sm"
      disabled={pending}
      onClick={() => onChange(enquiry.id, next)}
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
  );
}
