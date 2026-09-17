"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

import { ADMIN_NAV_ITEMS, NAV_ITEMS } from "@/lib/nav";
import { cn } from "@/lib/utils";

/** Mobile-only bottom tab bar. Native apps put navigation at the thumb, and an
 *  installed PWA has no browser chrome to fall back on. See CLAUDE.md §5a. */
export function BottomNav({ isAdmin = false }: { isAdmin?: boolean }) {
  const pathname = usePathname();
  const items = isAdmin ? ADMIN_NAV_ITEMS : NAV_ITEMS;

  return (
    <nav
      aria-label="Primary (mobile)"
      className={cn(
        "fixed inset-x-0 bottom-0 z-50 border-t border-border bg-background/95 backdrop-blur",
        "pb-[env(safe-area-inset-bottom,0px)] md:hidden",
      )}
    >
      <ul className="grid grid-cols-3">
        {items.map(({ href, label, Icon }) => {
          const active =
            href === "/"
              ? pathname === "/"
              : href === "/admin"
                ? pathname === "/admin"
                : pathname.startsWith(href);

          return (
            <li key={href}>
              <Link
                href={href}
                aria-current={active ? "page" : undefined}
                className={cn(
                  "flex min-h-[56px] flex-col items-center justify-center gap-1 text-xs font-medium transition-colors",
                  active
                    ? "text-primary"
                    : "text-muted-foreground hover:text-foreground",
                )}
              >
                <Icon className="size-5" aria-hidden />
                {label}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
