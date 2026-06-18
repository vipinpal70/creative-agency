import { NextRequest, NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import mongoose from "mongoose";
import { connectDB } from "@/lib/db";
import User from "@/lib/models/user.model";
import { signToken, COOKIE_NAME, SESSION_DURATION_SECONDS, getSession } from "@/lib/auth";
import { logActivity } from "@/lib/activity";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { firstName, lastName, email, password, role } = body;

    if (!firstName || !email || !password || !role) {
      await logActivity({ req, action: "REGISTER_FAILED", details: "Missing required fields", status: 400, requestData: body });
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
    }

    const validRoles = ["admin", "client", "sub-user", "member"];
    if (!validRoles.includes(role)) {
      await logActivity({ req, action: "REGISTER_FAILED", details: `Invalid role: ${role}`, status: 400, requestData: body });
      return NextResponse.json({ error: "Invalid role" }, { status: 400 });
    }

    await connectDB();

    const existing = await User.findOne({ email: email.toLowerCase() });
    if (existing) {
      await logActivity({ req, action: "REGISTER_FAILED", details: `Email already registered: ${email}`, status: 409, requestData: body });
      return NextResponse.json({ error: "Email already registered" }, { status: 409 });
    }

    const hashed = await bcrypt.hash(password, 12);
    const session = await getSession();
    const newUserId = new mongoose.Types.ObjectId();
    const creatorId = session ? session.userId : newUserId.toString();

    const user = await User.create({
      _id: newUserId,
      firstName,
      lastName: lastName || undefined,
      email: email.toLowerCase(),
      password: hashed,
      role,
      createdById: creatorId,
      lastUpdatedById: creatorId,
    });

    const token = await signToken({ userId: user._id.toString(), email: user.email, role: user.role });

    const res = NextResponse.json(
      { message: "User created", user: { id: user._id, email: user.email, role: user.role } },
      { status: 201 }
    );
    res.cookies.set(COOKIE_NAME, token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      maxAge: SESSION_DURATION_SECONDS,
      path: "/",
    });

    await logActivity({ req, action: "REGISTER_SUCCESS", details: `User registered: ${user.email}`, status: 201, requestData: body });

    return res;
  } catch (err) {
    console.error("[register]", err);
    await logActivity({ req, action: "REGISTER_ERROR", details: err instanceof Error ? err.message : "Internal server error", status: 500 });
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
