"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useScrollDirection } from "@/hooks/use-scroll-direction";

import { AdminSignOut } from "@/components/admin-sign-out";
import { ThemeToggle } from "@/components/theme-toggle";
import { Button } from "@/components/ui/button";
import { ADMIN_NAV_ITEMS, NAV_ITEMS } from "@/lib/nav";
import { cn } from "@/lib/utils";

export function SiteHeader({
  studentEmail,
  adminEmail,
}: {
  studentEmail?: string | null;
  adminEmail?: string | null;
}) {
  const pathname = usePathname();
  const isAdmin = Boolean(adminEmail);
  const navItems = isAdmin ? ADMIN_NAV_ITEMS : NAV_ITEMS;

  // Transparent over the hero, solid once scrolled; retracts on scroll down
  // and returns on scroll up (mobile only — desktop has space to spare).
  const { hidden, scrolled } = useScrollDirection();

  return (
    <header
      className={cn(
        "sticky top-0 z-50 pt-[env(safe-area-inset-top,0px)]",
        "transition-[transform,background-color,border-color] duration-200 ease-out",
        // Retract only on phones; motion-reduce keeps it pinned.
        hidden ? "max-md:-translate-y-full motion-reduce:translate-y-0" : "translate-y-0",
        scrolled
          ? "border-b border-border bg-background/80 backdrop-blur-md"
          : // Must paint a background on mobile: viewport-fit=cover extends the
            // page under the status bar, and a transparent header lets content
            // show through behind the clock in standalone mode.
            "border-b border-transparent bg-background md:bg-transparent",
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
          {navItems.map(({ href, label }) => {
            const active =
              href === "/"
                ? pathname === "/"
                : href === "/admin"
                  ? pathname === "/admin"
                  : pathname.startsWith(href);

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
          {isAdmin ? (
            <>
              <span className="hidden max-w-[20ch] truncate text-sm text-muted-foreground md:block">
                {adminEmail}
              </span>
              <AdminSignOut />
            </>
          ) : studentEmail ? (
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
