"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

import { ThemeToggle } from "@/components/theme-toggle";
import { NAV_ITEMS } from "@/lib/nav";
import { cn } from "@/lib/utils";

export function SiteHeader({ studentEmail }: { studentEmail?: string | null }) {
  const pathname = usePathname();

  return (
    <header className="sticky top-0 z-50 border-b border-border bg-background/95 pt-[env(safe-area-inset-top,0px)] backdrop-blur">
      <div className="mx-auto flex h-14 max-w-6xl items-center gap-6 px-4">
        <Link href="/" className="font-semibold tracking-tight">
          Aca<span className="text-primary">Domo</span>
        </Link>

        <nav aria-label="Primary" className="hidden md:flex md:gap-1">
          {NAV_ITEMS.map(({ href, label }) => {
            const active =
              href === "/" ? pathname === "/" : pathname.startsWith(href);

            return (
              <Link
                key={href}
                href={href}
                aria-current={active ? "page" : undefined}
                className={cn(
                  "rounded-md px-3 py-2 text-sm font-medium transition-colors",
                  active
                    ? "bg-muted text-foreground"
                    : "text-muted-foreground hover:bg-muted hover:text-foreground",
                )}
              >
                {label}
              </Link>
            );
          })}
        </nav>

        <div className="ml-auto flex items-center gap-1">
          {studentEmail ? (
            <Link
              href="/account"
              className="hidden max-w-[16ch] truncate rounded-md px-3 py-2 text-sm text-muted-foreground transition-colors hover:text-foreground md:block"
            >
              {studentEmail}
            </Link>
          ) : (
            <Link
              href="/signup"
              className="hidden rounded-md px-3 py-2 text-sm font-medium text-muted-foreground transition-colors hover:text-foreground md:block"
            >
              Sign in
            </Link>
          )}
          <ThemeToggle />
        </div>
      </div>
    </header>
  );
}
