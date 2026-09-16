"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";

import { ThemeToggle } from "@/components/theme-toggle";
import { Button } from "@/components/ui/button";
import { NAV_ITEMS } from "@/lib/nav";
import { cn } from "@/lib/utils";

export function SiteHeader({ studentEmail }: { studentEmail?: string | null }) {
  const pathname = usePathname();
  const [scrolled, setScrolled] = useState(false);

  // Transparent over the hero, solid once scrolled — the header should not
  // compete with the headline on first paint.
  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 24);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  return (
    <header
      className={cn(
        "sticky top-0 z-50 pt-[env(safe-area-inset-top,0px)] transition-colors duration-200",
        scrolled
          ? "border-b border-border bg-background/80 backdrop-blur-md"
          : "border-b border-transparent bg-transparent",
      )}
    >
      <div className="mx-auto flex h-16 max-w-6xl items-center gap-8 px-4 md:px-6">
        <Link
          href="/"
          className="font-display text-lg font-bold tracking-tight"
        >
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
                  "relative rounded-md px-3 py-2 text-sm font-medium transition-colors",
                  active
                    ? "text-foreground"
                    : "text-muted-foreground hover:text-foreground",
                )}
              >
                {label}
                {active ? (
                  <span className="absolute inset-x-3 -bottom-px h-px bg-primary" />
                ) : null}
              </Link>
            );
          })}
        </nav>

        <div className="ml-auto flex items-center gap-2">
          {studentEmail ? (
            <Link
              href="/account"
              className="hidden max-w-[18ch] truncate text-sm text-muted-foreground transition-colors hover:text-foreground md:block"
            >
              {studentEmail}
            </Link>
          ) : (
            <Button
              render={<Link href="/signup" />}
              size="sm"
              variant="outline"
              className="hidden md:inline-flex"
            >
              Sign in
            </Button>
          )}
          <ThemeToggle />
        </div>
      </div>
    </header>
  );
}
