import { NextResponse, type NextRequest } from "next/server";

import { ADMIN_COOKIE } from "@/lib/auth";

/**
 * Redirects signed-out visitors away from /admin pages.
 *
 * Next 16 renamed the `middleware` convention to `proxy`; the behaviour is
 * unchanged.
 *
 * This is UX only: it checks for a cookie's presence, not its validity, because
 * this runs on the Edge runtime where verifying a JWT would add latency to
 * every request. The real authorization check happens inside each admin route
 * handler and page (CLAUDE.md §3).
 */
export default function proxy(request: NextRequest) {
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
