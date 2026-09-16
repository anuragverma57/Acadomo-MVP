import { NextResponse, type NextRequest } from "next/server";

import { ADMIN_COOKIE } from "@/lib/auth";

/**
 * Redirects signed-out visitors away from /admin pages.
 *
 * This is UX only: it checks for a cookie's presence, not its validity, because
 * middleware runs on the Edge runtime where verifying a JWT adds latency to
 * every request. The real authorization check happens inside each admin route
 * handler and page (CLAUDE.md §3).
 */
export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  if (pathname === "/admin/login") {
    return NextResponse.next();
  }

  const hasCookie = request.cookies.has(ADMIN_COOKIE);

  if (!hasCookie) {
    const url = request.nextUrl.clone();
    url.pathname = "/admin/login";
    url.search = "";
    return NextResponse.redirect(url);
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/admin/:path*"],
};
