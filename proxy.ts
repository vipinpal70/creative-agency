import { NextRequest, NextResponse } from "next/server";
import { jwtVerify } from "jose";
import { JWTExpired } from "jose/errors";

const COOKIE_NAME = "auth_token";

const PUBLIC_PATHS = [
  "/",
  "/sign-in",
  "/admin/sign-up",
  "/session-expired",
  "/api/auth/login",
  "/api/auth/register",
  "/api/auth/logout",
];

export async function proxy(req: NextRequest) {
  const { pathname } = req.nextUrl;

  const isPublic =
    pathname === "/" ||
    PUBLIC_PATHS.filter((p) => p !== "/").some((p) => pathname.startsWith(p));
  if (isPublic) return NextResponse.next();

  const token = req.cookies.get(COOKIE_NAME)?.value;

  if (!token) {
    const url = new URL("/sign-in", req.url);
    url.searchParams.set("redirect", pathname);
    return NextResponse.redirect(url);
  }

  try {
    const secret = new TextEncoder().encode(process.env.JWT_SECRET);
    const { payload } = await jwtVerify(token, secret);
    const role = payload.role as string | undefined;

    // Role-based tree isolation: clients live in /client, everyone else in
    // /dashboard. Each is redirected out of the other's tree.
    const isClient = role === "client";
    if (isClient && pathname.startsWith("/dashboard")) {
      return NextResponse.redirect(new URL("/client", req.url));
    }
    if (!isClient && pathname.startsWith("/client")) {
      return NextResponse.redirect(new URL("/dashboard", req.url));
    }

    return NextResponse.next();
  } catch (err) {
    const res = NextResponse.redirect(
      new URL(err instanceof JWTExpired ? "/session-expired" : "/sign-in", req.url)
    );
    res.cookies.set(COOKIE_NAME, "", { maxAge: 0, path: "/" });
    return res;
  }
}

export const config = {
  matcher: [
    "/((?!api|_next/static|_next/image|favicon.ico|uploads|.*\\..*).*)",
  ],
};
