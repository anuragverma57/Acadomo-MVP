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
      {/* Column count follows the item count — hardcoding 3 wrapped the admin
          bar (4 tabs) onto a second line. */}
      <ul
        className="grid"
        style={{ gridTemplateColumns: `repeat(${items.length}, minmax(0, 1fr))` }}
      >
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
                  "flex min-h-[56px] flex-col items-center justify-center gap-1 px-1 text-center text-[11px] font-medium leading-tight transition-colors",
                  active
                    ? "text-primary"
                    : "text-muted-foreground hover:text-foreground",
                )}
              >
                <Icon className="size-5 shrink-0" aria-hidden />
                <span className="w-full truncate">{label}</span>
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
