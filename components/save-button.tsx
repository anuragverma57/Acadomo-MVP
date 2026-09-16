"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { toast } from "sonner";
import { Heart } from "lucide-react";

import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

/**
 * Save/unsave control. Optimistic: flips immediately and reverts if the
 * request fails, so the shortlist feels instant.
 */
export function SaveButton({
  propertyId,
  initialSaved,
  signedIn,
  variant = "icon",
}: {
  propertyId: number;
  initialSaved: boolean;
  signedIn: boolean;
  variant?: "icon" | "full";
}) {
  const router = useRouter();
  const [saved, setSaved] = useState(initialSaved);
  const [pending, setPending] = useState(false);

  async function toggle(event: React.MouseEvent) {
    // The control sits inside a card-wide link on the listing page.
    event.preventDefault();
    event.stopPropagation();

    if (!signedIn) {
      const next = encodeURIComponent(window.location.pathname + window.location.search);
      router.push(`/signup?next=${next}`);
      return;
    }

    const optimistic = !saved;
    setSaved(optimistic);
    setPending(true);

    try {
      const response = await fetch(`/api/saved/${propertyId}`, {
        method: optimistic ? "POST" : "DELETE",
      });

      if (!response.ok) {
        setSaved(!optimistic);
        toast.error("Couldn't update your shortlist.");
        return;
      }

      router.refresh();
    } catch {
      setSaved(!optimistic);
      toast.error("Couldn't reach the server.");
    } finally {
      setPending(false);
    }
  }

  const label = saved ? "Remove from shortlist" : "Save to shortlist";

  if (variant === "full") {
    return (
      <Button
        type="button"
        variant="outline"
        size="lg"
        onClick={toggle}
        disabled={pending}
        aria-pressed={saved}
        className="w-full gap-2"
      >
        <Heart className={cn("size-4", saved && "fill-current text-primary")} aria-hidden />
        {saved ? "Saved" : "Save"}
      </Button>
    );
  }

  return (
    <button
      type="button"
      onClick={toggle}
      disabled={pending}
      aria-label={label}
      aria-pressed={saved}
      title={label}
      className={cn(
        "inline-flex size-11 items-center justify-center rounded-full bg-background/90 backdrop-blur transition-colors",
        "hover:bg-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
      )}
    >
      <Heart
        className={cn(
          "size-5 transition-colors",
          saved ? "fill-current text-primary" : "text-foreground",
        )}
        aria-hidden
      />
    </button>
  );
}
