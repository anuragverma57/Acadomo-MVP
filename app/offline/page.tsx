import type { Metadata } from "next";
import Link from "next/link";
import { WifiOff } from "lucide-react";

import { Button } from "@/components/ui/button";

export const metadata: Metadata = {
  title: "Offline",
  robots: { index: false, follow: false },
};

export default function OfflinePage() {
  return (
    <div className="mx-auto flex max-w-md flex-col items-center px-4 py-20 text-center md:min-h-[70vh] md:justify-center">
      <div className="rounded-full bg-muted p-4">
        <WifiOff className="size-7 text-muted-foreground" aria-hidden />
      </div>
      <h1 className="font-display mt-5 text-2xl font-bold">You&apos;re offline</h1>
      <p className="mt-2 text-sm text-muted-foreground text-pretty">
        Properties you&apos;ve already viewed are still available. Sending an
        enquiry or signing in needs a connection.
      </p>
      <Button render={<Link href="/" />} className="mt-6">
        Back to listings
      </Button>
    </div>
  );
}
