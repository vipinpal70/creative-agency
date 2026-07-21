import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { isClient, forbidden } from "@/lib/authz";
import { connectDB } from "@/lib/db";
import User from "@/lib/models/user.model";
import { generatePassword, randomAvatarColor, TEAM_ROLES } from "@/lib/team-constants";
import { logActivity } from "@/lib/activity";
import bcrypt from "bcryptjs";

export async function GET(req: NextRequest) {
  try {
    const session = await getSession();
    if (!session) {
      await logActivity({ req, action: "VIEW_TEAM_MEMBERS_UNAUTHORIZED", details: "Unauthorized view team members attempt", status: 401 });
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    // Any authenticated user (incl. clients) may read the team directory —
    // the client profile's Assigned Team tab needs member names.

    await connectDB();
    // Include admin accounts alongside members so the directory lists them too.
    const members = await User.find({ role: { $in: ["member", "admin"] } })
      .sort({ createdAt: -1 })
      .lean();

    // Map database properties (firstName/lastName) to a computed 'name' for the frontend
    const safe = members.map(({ password: _pwd, firstName, lastName, ...rest }) => ({
      ...rest,
      name: `${firstName} ${lastName || ""}`.trim(),
    }));

    await logActivity({ req, action: "VIEW_TEAM_MEMBERS", details: `Viewed team directory. Total members: ${members.length}`, status: 200 });

    return NextResponse.json(safe);
  } catch (err: any) {
    await logActivity({ req, action: "VIEW_TEAM_MEMBERS_ERROR", details: err.message || "Failed to fetch team members", status: 500 });
    return NextResponse.json({ error: "Failed to fetch team members" }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  let body: any = null;
  try {
    const session = await getSession();
    if (!session) {
      await logActivity({ req, action: "CREATE_TEAM_MEMBER_UNAUTHORIZED", details: "Unauthorized create team member attempt", status: 401 });
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    if (isClient(session)) return forbidden();

    body = await req.json();
    const { name, email, phone, roles, password: manualPassword, type, outsource } = body;

    if (!name?.trim() || !email?.trim()) {
      await logActivity({ req, action: "CREATE_TEAM_MEMBER_FAILED", details: "Name and email are required", status: 400, requestData: body });
      return NextResponse.json({ error: "Name and email are required" }, { status: 400 });
    }
    if (!Array.isArray(roles) || roles.length === 0) {
      await logActivity({ req, action: "CREATE_TEAM_MEMBER_FAILED", details: "At least one role is required", status: 400, requestData: body });
      return NextResponse.json({ error: "At least one role is required" }, { status: 400 });
    }
    const invalid = roles.filter((r: string) => !TEAM_ROLES.includes(r as never));
    if (invalid.length > 0) {
      await logActivity({ req, action: "CREATE_TEAM_MEMBER_FAILED", details: `Invalid roles: ${invalid.join(", ")}`, status: 400, requestData: body });
      return NextResponse.json({ error: `Invalid roles: ${invalid.join(", ")}` }, { status: 400 });
    }

    if (type && !["internal", "outsource"].includes(type)) {
      await logActivity({ req, action: "CREATE_TEAM_MEMBER_FAILED", details: `Invalid type: ${type}`, status: 400, requestData: body });
      return NextResponse.json({ error: "Invalid type (must be internal or outsource)" }, { status: 400 });
    }

    await connectDB();

    const existing = await User.findOne({ email: email.toLowerCase().trim() });
    if (existing) {
      await logActivity({ req, action: "CREATE_TEAM_MEMBER_FAILED", details: `Email already exists: ${email}`, status: 409, requestData: body });
      return NextResponse.json({ error: "A user with this email already exists" }, { status: 409 });
    }

    const plainPassword = manualPassword?.trim() || generatePassword();
    const hashed = await bcrypt.hash(plainPassword, 10);

    // Split name into firstName and lastName for database schema alignment
    const nameParts = name.trim().split(" ");
    const firstName = nameParts[0];
    const lastName = nameParts.slice(1).join(" ") || undefined;

    const member = await User.create({
      firstName,
      lastName,
      email: email.toLowerCase().trim(),
      phone: phone?.trim() || undefined,
      password: hashed,
      role: "member",
      roles,
      status: "active",
      type: type || "internal",
      outsource: type === "outsource" ? outsource : undefined,
      avatarColor: randomAvatarColor(),
      createdById: session.userId,
      lastUpdatedById: session.userId,
    });

    // TODO: send welcome email with credentials (Resend / Nodemailer)
    // await sendWelcomeEmail({ to: email, name, password: plainPassword });

    await logActivity({ req, action: "CREATE_TEAM_MEMBER_SUCCESS", details: `Created team member: ${member.email} (${member.type})`, status: 201, requestData: body });

    return NextResponse.json(
      {
        id: member._id,
        name: `${member.firstName} ${member.lastName || ""}`.trim(),
        email: member.email,
        phone: member.phone,
        roles: member.roles,
        status: member.status,
        type: member.type,
        outsource: member.outsource,
        password: plainPassword, // returned ONCE for display / copy
        message: "Member created. Welcome email would be sent here.",
      },
      { status: 201 }
    );
  } catch (err: any) {
    await logActivity({ req, action: "CREATE_TEAM_MEMBER_ERROR", details: err.message || "Failed to create team member", status: 500, requestData: body });
    return NextResponse.json({ error: err.message || "Failed to create team member" }, { status: 500 });
  }
}
