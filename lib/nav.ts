import { Home, Search, User } from "lucide-react";

/** Single source of truth for primary navigation, shared by the mobile bottom
 *  tabs and the desktop header so the two can never drift apart. */
export const NAV_ITEMS = [
  { href: "/", label: "Home", Icon: Home },
  { href: "/properties", label: "Browse", Icon: Search },
  { href: "/account", label: "Account", Icon: User },
] as const;

export type NavItem = (typeof NAV_ITEMS)[number];
