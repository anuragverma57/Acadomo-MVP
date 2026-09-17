import Link from "next/link";

import { Button } from "@/components/ui/button";

export function AdminPagination({
  page,
  totalPages,
  params,
  basePath = "/admin",
}: {
  page: number;
  totalPages: number;
  params: Record<string, string | string[] | undefined>;
  basePath?: string;
}) {
  if (totalPages <= 1) return null;

  const linkFor = (target: number) => {
    const next = new URLSearchParams();
    for (const [key, value] of Object.entries(params)) {
      if (typeof value === "string" && key !== "page") next.set(key, value);
    }
    if (target > 1) next.set("page", String(target));
    const qs = next.toString();
    return qs ? `${basePath}?${qs}` : basePath;
  };

  return (
    <nav
      aria-label="Pagination"
      className="flex items-center justify-center gap-3 pt-2"
    >
      {/* A disabled <a> is still focusable and clickable, so render a real
          disabled button at the boundaries instead of a dead link. */}
      {page <= 1 ? (
        <Button variant="outline" disabled>
          Previous
        </Button>
      ) : (
        <Button render={<Link href={linkFor(page - 1)} />} variant="outline">
          Previous
        </Button>
      )}
      <span className="text-sm text-muted-foreground tabular">
        Page {page} of {totalPages}
      </span>
      {page >= totalPages ? (
        <Button variant="outline" disabled>
          Next
        </Button>
      ) : (
        <Button render={<Link href={linkFor(page + 1)} />} variant="outline">
          Next
        </Button>
      )}
    </nav>
  );
}
