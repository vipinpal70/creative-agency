import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { connectDB } from "@/lib/db";
import User from "@/lib/models/user.model";

export async function GET(req: NextRequest) {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    await connectDB();
    const userDoc = await User.findById(session.userId).select("-password").lean();
    if (!userDoc) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }
    const user = {
      ...userDoc,
      id: (userDoc._id as any).toString(),
      _id: (userDoc._id as any).toString(),
    };
    return NextResponse.json({ user });
  } catch (err) {
    console.error("[me]", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
