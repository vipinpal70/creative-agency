import { NextRequest, NextResponse } from "next/server";
import { getSession, type JWTPayload } from "@/lib/auth";
import { isClient, assertClientAccess, notFound, forbidden } from "@/lib/authz";
import { connectDB } from "@/lib/db";
import Calendar from "@/lib/models/calendar.model";
import Deliverable from "@/lib/models/deliverable.model";

type Ctx = { params: Promise<{ id: string; calId: string }> };

function canManageCalendar(
  session: JWTPayload,
  calendar: { createdBy: unknown }
): boolean {
  return session.role === "admin" || session.role === "member" || String(calendar.createdBy) === session.userId;
}

// GET /api/clients/[id]/calendars/[calId]/scope
// Returns calendar scope of work planned items + deliverable progress
export async function GET(req: NextRequest, { params }: Ctx) {
  try {
    const session = await getSession();
    if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { id, calId } = await params;
    if (isClient(session)) {
      if (!(await assertClientAccess(session, id))) return notFound();
    }

    await connectDB();

    const calendar = await Calendar.findOne({ _id: calId, clientId: id }).lean();
    if (!calendar) {
      return NextResponse.json({ error: "Calendar not found" }, { status: 404 });
    }

    const deliverables = await Deliverable.find({ calendarId: calId }).lean();
    const plannedItemsWithProgress = calendar.plannedItems.map((item) => {
      const itemDels = deliverables.filter((d) => d.type === item.type);
      return {
        ...item,
        createdQty:   itemDels.length,
        deliveredQty: itemDels.filter((d) => d.status === "delivered").length,
      };
    });

    const totalPlanned   = calendar.plannedItems.reduce((s, i) => s + (i.plannedQty || 0), 0);
    const totalCreated   = deliverables.length;
    const totalDelivered = deliverables.filter((d) => d.status === "delivered").length;

    return NextResponse.json({
      calendarId: calId,
      plannedItems: plannedItemsWithProgress,
      progress: { totalPlanned, totalCreated, totalDelivered },
    });
  } catch (err: any) {
    console.error("[calendar scope GET]", err);
    return NextResponse.json({ error: err.message || "Internal error" }, { status: 500 });
  }
}

// PATCH /api/clients/[id]/calendars/[calId]/scope
// Updates the scope of work (planned items) for a calendar.
export async function PATCH(req: NextRequest, { params }: Ctx) {
  try {
    const session = await getSession();
    if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { id, calId } = await params;
    if (isClient(session)) {
      if (!(await assertClientAccess(session, id))) return notFound();
    }

    const body = await req.json();
    const { plannedItems } = body;

    if (!Array.isArray(plannedItems)) {
      return NextResponse.json({ error: "plannedItems array is required" }, { status: 400 });
    }

    await connectDB();

    const calendar = await Calendar.findOne({ _id: calId, clientId: id });
    if (!calendar) {
      return NextResponse.json({ error: "Calendar not found" }, { status: 404 });
    }

    if (!canManageCalendar(session, calendar)) {
      return forbidden("You do not have permission to edit this calendar's scope of work");
    }

    // Format & validate planned items
    calendar.plannedItems = plannedItems.map((item: any) => ({
      scopeItemId:  item.scopeItemId || item.label?.toLowerCase()?.replace(/[^a-z0-9]/g, "-") || "custom-item",
      label:         String(item.label || "Custom Item").trim(),
      type:          String(item.type || item.label || "Custom Item").trim(),
      platforms:     Array.isArray(item.platforms) ? item.platforms : [],
      plannedQty:    typeof item.plannedQty === "number" ? Math.max(0, item.plannedQty) : Number(item.plannedQty) || 0,
      totalInScope:  typeof item.totalInScope === "number" ? Math.max(0, item.totalInScope) : Number(item.totalInScope) || 0,
    }));

    await calendar.save();

    const deliverables = await Deliverable.find({ calendarId: calId }).lean();
    const plannedItemsWithProgress = calendar.plannedItems.map((item) => {
      const itemDels = deliverables.filter((d) => d.type === item.type);
      return {
        scopeItemId:  item.scopeItemId,
        label:        item.label,
        type:         item.type,
        platforms:    item.platforms,
        plannedQty:   item.plannedQty,
        totalInScope: item.totalInScope,
        createdQty:   itemDels.length,
        deliveredQty: itemDels.filter((d) => d.status === "delivered").length,
      };
    });

    const totalPlanned   = calendar.plannedItems.reduce((s, i) => s + (i.plannedQty || 0), 0);
    const totalCreated   = deliverables.length;
    const totalDelivered = deliverables.filter((d) => d.status === "delivered").length;

    return NextResponse.json({
      id: calId,
      plannedItems: plannedItemsWithProgress,
      progress: { totalPlanned, totalCreated, totalDelivered },
    });
  } catch (err: any) {
    console.error("[calendar scope PATCH]", err);
    return NextResponse.json({ error: err.message || "Internal error" }, { status: 500 });
  }
}

export async function PUT(req: NextRequest, ctx: Ctx) {
  return PATCH(req, ctx);
}
