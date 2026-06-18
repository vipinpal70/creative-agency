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

  const isPublic = PUBLIC_PATHS.some((p) => pathname.startsWith(p));
  if (isPublic) return NextResponse.next();

  const token = req.cookies.get(COOKIE_NAME)?.value;

  if (!token) {
    const url = new URL("/sign-in", req.url);
    url.searchParams.set("redirect", pathname);
    return NextResponse.redirect(url);
  }

  try {
    const secret = new TextEncoder().encode(process.env.JWT_SECRET);
    await jwtVerify(token, secret);
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
  matcher: ["/((?!_next/static|_next/image|favicon.ico|public/).*)"],
};
