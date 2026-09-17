import {
  BarChart3,
  Building2,
  Heart,
  Home,
  Inbox,
  User,
  type LucideIcon,
} from "lucide-react";

/** Single source of truth for primary navigation, shared by the mobile bottom
 *  tabs and the desktop header so the two can never drift apart. */
export type NavItem = { href: string; label: string; Icon: LucideIcon };

/** Public / student navigation. */
export const NAV_ITEMS: readonly NavItem[] = [
  { href: "/", label: "Browse", Icon: Home },
  { href: "/saved", label: "Saved", Icon: Heart },
  { href: "/account", label: "Account", Icon: User },
];

/**
 * Admin navigation. A signed-in admin must never be offered student
 * destinations — the realms are separate in the tokens, and the UI has to
 * reflect that or it reads as broken.
 */
export const ADMIN_NAV_ITEMS: readonly NavItem[] = [
  { href: "/admin", label: "Enquiries", Icon: Inbox },
  { href: "/admin/properties", label: "Properties", Icon: Building2 },
  { href: "/admin/analytics", label: "Analytics", Icon: BarChart3 },
  { href: "/", label: "Site", Icon: Home },
];
