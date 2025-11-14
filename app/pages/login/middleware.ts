import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

export function middleware(req: NextRequest) {
  const isLoggedIn =
    req.cookies.get("fleet_auth")?.value ||
    req.headers.get("x-fleet-auth") ||
    false;

  const url = req.nextUrl.clone();

  // Allow these routes WITHOUT login
  const allowed = ["/login", "/_next", "/api", "/favicon.ico"];

  if (allowed.some((x) => url.pathname.startsWith(x))) {
    return NextResponse.next();
  }

  // Read login state stored in localStorage from client
  const authCookie = req.cookies.get("fleet_auth");

  if (!authCookie) {
    url.pathname = "/login";
    return NextResponse.redirect(url);
  }

  return NextResponse.next();
}

export const config = {
  matcher: "/:path*",
};
