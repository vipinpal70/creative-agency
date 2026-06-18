import { NextRequest, NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { randomUUID } from "crypto";
import { connectDB } from "@/lib/db";
import User from "@/lib/models/user.model";
import { signToken, COOKIE_NAME, SESSION_DURATION_SECONDS } from "@/lib/auth";
import { logActivity } from "@/lib/activity";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { email, password } = body;

    if (!email || !password) {
      await logActivity({ req, action: "LOGIN_FAILED", details: "Missing email or password", status: 400, requestData: body });
      return NextResponse.json({ error: "Email and password are required" }, { status: 400 });
    }

    await connectDB();

    const user = await User.findOne({ email: email.toLowerCase() });
    if (!user) {
      await logActivity({ req, action: "LOGIN_FAILED", details: `User not found: ${email}`, status: 401, requestData: body });
      return NextResponse.json({ error: "Invalid credentials" }, { status: 401 });
    }

    if (user.status !== "active") {
      await logActivity({ req, action: "LOGIN_FAILED", details: `Inactive user login attempt: ${email}`, status: 403, requestData: body });
      return NextResponse.json({ error: "Account is inactive. Please contact your administrator." }, { status: 403 });
    }

    const valid = await bcrypt.compare(password, user.password);
    if (!valid) {
      await logActivity({ req, action: "LOGIN_FAILED", details: `Invalid password for: ${email}`, status: 401, requestData: body });
      return NextResponse.json({ error: "Invalid credentials" }, { status: 401 });
    }

    const sessionToken = randomUUID();
    const sessionExpiry = new Date(Date.now() + SESSION_DURATION_SECONDS * 1000);
    const accessToken = await signToken({
      userId: user._id.toString(),
      email: user.email,
      role: user.role,
    });

    await User.findByIdAndUpdate(user._id, {
      lastSignInAt: new Date(),
      sessionToken,
      sessionExpiry,
      accessToken,
    });

    const res = NextResponse.json({
      message: "Signed in",
      user: { id: user._id.toString(), email: user.email, role: user.role, firstName: user.firstName },
    });
    res.cookies.set(COOKIE_NAME, accessToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      maxAge: SESSION_DURATION_SECONDS,
      path: "/",
    });

    await logActivity({ req, action: "LOGIN_SUCCESS", details: `User logged in: ${user.email}`, status: 200, requestData: body });

    return res;
  } catch (err) {
    console.error("[login]", err);
    await logActivity({ req, action: "LOGIN_ERROR", details: err instanceof Error ? err.message : "Internal server error", status: 500 });
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
