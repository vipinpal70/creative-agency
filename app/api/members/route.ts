import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { connectDB } from "@/lib/db";
import User from "@/lib/models/user.model";

// GET /api/members - returns active team members for task assignment
export async function GET(_req: NextRequest) {
  try {
    const session = await getSession();
    if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    await connectDB();
    const members = await User.find({ role: "member", status: "active" })
      .select("firstName lastName roles")
      .sort({ firstName: 1 })
      .lean();

    return NextResponse.json(
      members.map((m) => ({
        user: {
          id: m._id.toString(),
          name: `${m.firstName} ${(m.lastName as string) || ""}`.trim(),
        },
        roles: (m.roles as string[]) || [],
      }))
    );
  } catch (err: any) {
    console.error("[members GET]", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
