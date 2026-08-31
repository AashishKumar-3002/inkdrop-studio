import { NextResponse, type NextRequest } from "next/server";

/**
 * Route protection (Next 16's `proxy` convention, formerly `middleware`).
 *
 * This is a fast cookie presence check only — it keeps signed-out visitors
 * from loading the app shell and bouncing. It is NOT the security boundary:
 * every API route independently verifies the session and the project's
 * owner (see lib/apiHelpers.ts), because a cookie's mere existence proves
 * nothing.
 */
const PROTECTED_PREFIXES = ["/project", "/dashboard"];
const AUTH_ROUTES = ["/login", "/register"];

const SESSION_COOKIES = [
  "authjs.session-token",
  "__Secure-authjs.session-token",
];

function hasSessionCookie(req: NextRequest): boolean {
  return SESSION_COOKIES.some((name) => req.cookies.has(name));
}

export default function proxy(req: NextRequest) {
  const { pathname, search } = req.nextUrl;
  const signedIn = hasSessionCookie(req);

  if (PROTECTED_PREFIXES.some((p) => pathname.startsWith(p)) && !signedIn) {
    const url = new URL("/login", req.url);
    // Come back to where they were headed after signing in.
    url.searchParams.set("callbackUrl", pathname + search);
    return NextResponse.redirect(url);
  }

  if (AUTH_ROUTES.includes(pathname) && signedIn) {
    return NextResponse.redirect(new URL("/dashboard", req.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    // Everything except Next internals, the auth API and static assets.
    "/((?!api/auth|api/health|_next/static|_next/image|favicon.ico|logo.png|.*\\.svg).*)",
  ],
};
