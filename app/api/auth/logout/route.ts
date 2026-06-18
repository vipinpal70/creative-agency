import { NextRequest, NextResponse } from "next/server";
import { connectDB } from "@/lib/db";
import User from "@/lib/models/user.model";
import { COOKIE_NAME, getSession } from "@/lib/auth";
import { logActivity } from "@/lib/activity";

export async function POST(req: NextRequest) {
  try {
    const session = await getSession();

    if (session) {
      await connectDB();
      await User.findByIdAndUpdate(session.userId, {
        sessionToken: null,
        sessionExpiry: null,
        accessToken: null,
      });
      await logActivity({ req, action: "LOGOUT", details: `User logged out: ${session.email}`, status: 200 });
    }
  } catch (err) {
    // best-effort DB cleanup; still clear cookie
    await logActivity({ req, action: "LOGOUT_ERROR", details: err instanceof Error ? err.message : "Error during logout DB update", status: 500 });
  }

  const res = NextResponse.json({ message: "Logged out" });
  res.cookies.set(COOKIE_NAME, "", {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    maxAge: 0,
    path: "/",
  });
  return res;
}
