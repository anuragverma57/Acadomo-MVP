import { Heart, Home, User } from "lucide-react";

/** Single source of truth for primary navigation, shared by the mobile bottom
 *  tabs and the desktop header so the two can never drift apart. */
export const NAV_ITEMS = [
  { href: "/", label: "Browse", Icon: Home },
  { href: "/saved", label: "Saved", Icon: Heart },
  { href: "/account", label: "Account", Icon: User },
] as const;

export type NavItem = (typeof NAV_ITEMS)[number];
