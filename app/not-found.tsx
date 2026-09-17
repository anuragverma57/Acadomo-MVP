import type { Metadata } from "next";
import Link from "next/link";
import { Compass } from "lucide-react";

import { Button } from "@/components/ui/button";

export const metadata: Metadata = {
  title: "Page not found",
};

export default function NotFound() {
  return (
    <div className="mx-auto flex max-w-md flex-col items-center px-4 py-20 text-center md:min-h-[60vh] md:justify-center">
      <div className="rounded-full bg-muted p-4">
        <Compass className="size-7 text-muted-foreground" aria-hidden />
      </div>
      <p className="text-eyebrow mt-5 text-muted-foreground">404</p>
      <h1 className="font-display mt-2 text-2xl font-bold">Page not found</h1>
      <p className="mt-2 text-sm text-muted-foreground text-pretty">
        That page doesn&apos;t exist. It may have moved, or the link might be
        incorrect.
      </p>
      <Button render={<Link href="/" />} className="mt-6">
        Browse properties
      </Button>
    </div>
  );
}
