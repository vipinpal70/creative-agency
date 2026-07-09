import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { isClient, assertClientAccess, notFound } from "@/lib/authz";
import { connectDB } from "@/lib/db";
import Deliverable from "@/lib/models/deliverable.model";
import Calendar from "@/lib/models/calendar.model";
import type { DeliverableType, TeamRole } from "@/lib/models/deliverable.model";

type Ctx = { params: Promise<{ id: string }> };

// Roles auto-suggested per deliverable type
const ROLES_BY_TYPE: Record<DeliverableType, TeamRole[]> = {
  image:             ["writer", "designer"],
  "image/carousel":  ["writer", "designer"],
  reel:              ["script_writer", "video_editor"],
  story:             ["script_writer", "video_editor"],
  "reel/story":      ["script_writer", "video_editor"],
  video:             ["script_writer", "video_editor"],
  blog:              ["writer"],
  ad:                ["writer", "designer"],
  "email-blast":     ["writer"],
  "seo-task":        ["writer"],
  "influencer-post": ["strategist"],
  custom:            [],
};

// GET /api/clients/[id]/deliverables
// Query: ?calendarId= &module= &status= &type= &bucket=
export async function GET(req: NextRequest, { params }: Ctx) {
  try {
    const session = await getSession();
    if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    if (isClient(session)) {
      const { id } = await params;
      if (!(await assertClientAccess(session, id))) return notFound();
    }

    const { id } = await params;
    await connectDB();

    const { searchParams } = new URL(req.url);
    const calendarId = searchParams.get("calendarId");
    const module     = searchParams.get("module");
    const status     = searchParams.get("status");
    const type       = searchParams.get("type");
    const bucket     = searchParams.get("bucket");

    const filter: Record<string, any> = { clientId: id };
    if (calendarId) filter.calendarId = calendarId;
    if (module)     filter.module     = module;
    if (status)     filter.status     = status;
    if (type)       filter.type       = type;
    if (bucket)     filter.buckets    = bucket;

    const deliverables = await Deliverable.find(filter)
      .sort({ scheduledDate: 1 })
      .lean();

    return NextResponse.json(
      deliverables.map((d) => ({ ...d, id: (d._id as any).toString() }))
    );
  } catch (err: any) {
    console.error("[deliverables GET]", err);
    return NextResponse.json({ error: err.message || "Internal error" }, { status: 500 });
  }
}

// POST /api/clients/[id]/deliverables
// Body: { calendarId, module, type, platform, title, buckets?, scheduledDate, assignedTeam?, notes? }
export async function POST(req: NextRequest, { params }: Ctx) {
  try {
    const session = await getSession();
    if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    if (isClient(session)) {
      const { id } = await params;
      if (!(await assertClientAccess(session, id))) return notFound();
    }

    const { id } = await params;
    const body = await req.json();
    const { calendarId, module, type, platforms, title, buckets, scheduledDate, assignedTeam, notes } = body;

    if (!calendarId || !module || !type || !title?.trim() || !scheduledDate) {
      return NextResponse.json(
        { error: "calendarId, module, type, title, and scheduledDate are required" },
        { status: 400 }
      );
    }

    await connectDB();

    // Verify the calendar belongs to this client
    const calendar = await Calendar.findOne({ _id: calendarId, clientId: id }).lean();
    if (!calendar) {
      return NextResponse.json({ error: "Calendar not found for this client" }, { status: 404 });
    }

    const deliverable = await Deliverable.create({
      clientId:      id,
      scopeId:       calendar.scopeId,
      calendarId,
      module,
      type,
      platforms:     Array.isArray(platforms) ? platforms : [],
      title:         title.trim(),
      buckets:       Array.isArray(buckets) ? buckets : [],
      scheduledDate: new Date(scheduledDate),
      assignedTeam:  Array.isArray(assignedTeam) ? assignedTeam : [],
      notes:         notes?.trim() || "",
      status:        "pending",
    });

    const suggestedRoles = ROLES_BY_TYPE[type as DeliverableType] ?? [];

    return NextResponse.json(
      { ...deliverable.toObject(), id: deliverable._id.toString(), suggestedRoles },
      { status: 201 }
    );
  } catch (err: any) {
    console.error("[deliverables POST]", err);
    return NextResponse.json({ error: err.message || "Internal error" }, { status: 500 });
  }
}
