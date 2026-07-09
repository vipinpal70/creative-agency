import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { isClient, forbidden } from "@/lib/authz";
import { connectDB } from "@/lib/db";
import User from "@/lib/models/user.model";
import { TEAM_ROLES } from "@/lib/team-constants";
import { logActivity } from "@/lib/activity";
import bcrypt from "bcryptjs";

type Ctx = { params: Promise<{ id: string }> };

export async function GET(req: NextRequest, { params }: Ctx) {
  try {
    const session = await getSession();
    if (!session) {
      await logActivity({ req, action: "VIEW_TEAM_MEMBER_UNAUTHORIZED", details: "Unauthorized view team member attempt", status: 401 });
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    if (isClient(session)) return forbidden();

    const { id } = await params;
    await connectDB();

    const member = await User.findOne({ _id: id, role: "member" }).lean();
    if (!member) {
      await logActivity({ req, action: "VIEW_TEAM_MEMBER_FAILED", details: `Member not found: ${id}`, status: 404 });
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }

    const { password: _pwd, firstName, lastName, ...rest } = member;
    const safe = {
      ...rest,
      name: `${firstName} ${lastName || ""}`.trim(),
    };

    await logActivity({ req, action: "VIEW_TEAM_MEMBER", details: `Viewed team member: ${member.email}`, status: 200 });

    return NextResponse.json(safe);
  } catch (err: any) {
    await logActivity({ req, action: "VIEW_TEAM_MEMBER_ERROR", details: err.message || "Failed to fetch member", status: 500 });
    return NextResponse.json({ error: "Failed to fetch member" }, { status: 500 });
  }
}

export async function PATCH(req: NextRequest, { params }: Ctx) {
  let body: any = null;
  const { id } = await params;
  try {
    const session = await getSession();
    if (!session) {
      await logActivity({ req, action: "UPDATE_TEAM_MEMBER_UNAUTHORIZED", details: `Unauthorized update team member attempt: ${id}`, status: 401 });
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    if (isClient(session)) return forbidden();

    body = await req.json();
    await connectDB();

    const member = await User.findOne({ _id: id, role: "member" });
    if (!member) {
      await logActivity({ req, action: "UPDATE_TEAM_MEMBER_FAILED", details: `Member not found: ${id}`, status: 404, requestData: body });
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }

    // Update basic fields
    if (body.name !== undefined) {
      const nameParts = body.name.trim().split(" ");
      member.firstName = nameParts[0];
      member.lastName = nameParts.slice(1).join(" ") || undefined;
    }
    if (body.email !== undefined) member.email = body.email.toLowerCase().trim();
    if (body.phone !== undefined) member.phone = body.phone.trim() || undefined;

    // Update type and outsource details
    if (body.type !== undefined) {
      if (!["internal", "outsource"].includes(body.type)) {
        await logActivity({ req, action: "UPDATE_TEAM_MEMBER_FAILED", details: `Invalid type: ${body.type}`, status: 400, requestData: body });
        return NextResponse.json({ error: "Invalid type" }, { status: 400 });
      }
      member.type = body.type;
    }

    if (body.outsource !== undefined) {
      member.outsource = body.outsource;
    }

    // Clear outsource details if type is changed to internal
    if (member.type === "internal") {
      member.outsource = undefined;
    }

    // Update roles
    if (body.roles !== undefined) {
      if (!Array.isArray(body.roles) || body.roles.length === 0) {
        await logActivity({ req, action: "UPDATE_TEAM_MEMBER_FAILED", details: "At least one role required", status: 400, requestData: body });
        return NextResponse.json({ error: "At least one role required" }, { status: 400 });
      }
      const invalid = body.roles.filter((r: string) => !TEAM_ROLES.includes(r as never));
      if (invalid.length > 0) {
        await logActivity({ req, action: "UPDATE_TEAM_MEMBER_FAILED", details: `Invalid roles: ${invalid.join(", ")}`, status: 400, requestData: body });
        return NextResponse.json({ error: `Invalid roles: ${invalid.join(", ")}` }, { status: 400 });
      }
      member.roles = body.roles;
    }

    // Toggle status
    if (body.status !== undefined) {
      if (!["active", "inactive"].includes(body.status)) {
        await logActivity({ req, action: "UPDATE_TEAM_MEMBER_FAILED", details: `Invalid status: ${body.status}`, status: 400, requestData: body });
        return NextResponse.json({ error: "Invalid status" }, { status: 400 });
      }
      member.status = body.status;
    }

    // Password reset
    let passReset = false;
    if (body.password !== undefined) {
      if (body.password.length < 8) {
        await logActivity({ req, action: "UPDATE_TEAM_MEMBER_FAILED", details: "Password must be at least 8 characters", status: 400, requestData: body });
        return NextResponse.json({ error: "Password must be at least 8 characters" }, { status: 400 });
      }
      member.password = await bcrypt.hash(body.password, 10);
      member.lastEmailSentAt = new Date(); // mark that credentials were sent/updated
      passReset = true;
    }

    member.lastUpdatedById = session.userId;
    await member.save();

    const { password: _pwd, firstName, lastName, ...rest } = member.toObject();
    const safe = {
      ...rest,
      name: `${firstName} ${lastName || ""}`.trim(),
    };

    const actionStr = passReset ? "RESET_MEMBER_PASSWORD" : "UPDATE_TEAM_MEMBER_SUCCESS";
    const detailStr = passReset
      ? `Reset password for member: ${member.email}`
      : `Updated team member details for: ${member.email}`;

    await logActivity({ req, action: actionStr, details: detailStr, status: 200, requestData: body });

    return NextResponse.json(safe);
  } catch (err: any) {
    await logActivity({ req, action: "UPDATE_TEAM_MEMBER_ERROR", details: err.message || "Failed to update member", status: 500, requestData: body });
    return NextResponse.json({ error: err.message || "Failed to update member" }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest, { params }: Ctx) {
  const { id } = await params;
  try {
    const session = await getSession();
    if (!session) {
      await logActivity({ req, action: "DELETE_TEAM_MEMBER_UNAUTHORIZED", details: `Unauthorized delete team member attempt: ${id}`, status: 401 });
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    if (isClient(session)) return forbidden();

    await connectDB();

    const member = await User.findOneAndDelete({ _id: id, role: "member" });
    if (!member) {
      await logActivity({ req, action: "DELETE_TEAM_MEMBER_FAILED", details: `Member not found to delete: ${id}`, status: 404 });
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }

    await logActivity({ req, action: "DELETE_TEAM_MEMBER_SUCCESS", details: `Deleted team member: ${member.email}`, status: 200 });

    return NextResponse.json({ message: "Member deleted successfully" });
  } catch (err: any) {
    await logActivity({ req, action: "DELETE_TEAM_MEMBER_ERROR", details: err.message || "Failed to delete member", status: 500 });
    return NextResponse.json({ error: "Failed to delete member" }, { status: 500 });
  }
}
