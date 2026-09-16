import Link from "next/link";
import { SearchX } from "lucide-react";

import { Button } from "@/components/ui/button";

export default function PropertyNotFound() {
  return (
    <div className="mx-auto flex max-w-md flex-col items-center px-4 py-24 text-center">
      <div className="rounded-full bg-muted p-3">
        <SearchX className="size-6 text-muted-foreground" aria-hidden />
      </div>
      <h1 className="font-display mt-4 text-xl font-bold">Property not found</h1>
      <p className="mt-2 text-sm text-muted-foreground text-pretty">
        This listing may have been removed, or the link might be incorrect.
      </p>
      <Button render={<Link href="/" />} className="mt-6">
        Browse all properties
      </Button>
    </div>
  );
}
