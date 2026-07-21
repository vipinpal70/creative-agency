import { NextRequest, NextResponse } from "next/server";
import { getSession, type JWTPayload } from "@/lib/auth";
import { isClient, assertClientAccess, notFound, forbidden } from "@/lib/authz";
import { connectDB } from "@/lib/db";
import Calendar from "@/lib/models/calendar.model";
import Deliverable from "@/lib/models/deliverable.model";
import ContentDraft from "@/lib/models/content-draft.model";
import { purgeDraft } from "@/lib/copy-cleanup";

type Ctx = { params: Promise<{ id: string; calId: string }> };

// Only an admin, or the user who created the calendar, may edit or delete it.
function canManageCalendar(
  session: JWTPayload,
  calendar: { createdBy: unknown }
): boolean {
  return session.role === "admin" || String(calendar.createdBy) === session.userId;
}

// GET /api/clients/[id]/calendars/[calId]
// Returns calendar + per-plannedItem deliverable progress
export async function GET(req: NextRequest, { params }: Ctx) {
  try {
    const session = await getSession();
    if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    if (isClient(session)) {
      const { id } = await params;
      if (!(await assertClientAccess(session, id))) return notFound();
    }

    const { id, calId } = await params;
    await connectDB();

    const calendar = await Calendar.findOne({ _id: calId, clientId: id })
      .populate("createdBy", "firstName lastName email")
      .lean();

    if (!calendar) {
      return NextResponse.json({ error: "Calendar not found" }, { status: 404 });
    }

    // Fetch all deliverables for this calendar to calculate per-item progress
    const deliverables = await Deliverable.find({ calendarId: calId }).lean();

    const plannedItemsWithProgress = calendar.plannedItems.map((item) => {
      const itemDels = deliverables.filter((d) => d.type === item.type);
      return {
        ...item,
        createdQty:   itemDels.length,
        deliveredQty: itemDels.filter((d) => d.status === "delivered").length,
      };
    });

    const totalPlanned   = calendar.plannedItems.reduce((s, i) => s + i.plannedQty, 0);
    const totalCreated   = deliverables.length;
    const totalDelivered = deliverables.filter((d) => d.status === "delivered").length;

    return NextResponse.json({
      ...calendar,
      id: (calendar._id as any).toString(),
      plannedItems: plannedItemsWithProgress,
      progress: { totalPlanned, totalCreated, totalDelivered },
    });
  } catch (err: any) {
    console.error("[calendar GET]", err);
    return NextResponse.json({ error: err.message || "Internal error" }, { status: 500 });
  }
}

// PATCH /api/clients/[id]/calendars/[calId]
// Updatable: name, objective, startDate, endDate, status, plannedItems
export async function PATCH(req: NextRequest, { params }: Ctx) {
  try {
    const session = await getSession();
    if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    if (isClient(session)) {
      const { id } = await params;
      if (!(await assertClientAccess(session, id))) return notFound();
    }

    const { id, calId } = await params;
    const body = await req.json();
    await connectDB();

    const calendar = await Calendar.findOne({ _id: calId, clientId: id });
    if (!calendar) {
      return NextResponse.json({ error: "Calendar not found" }, { status: 404 });
    }

    if (!canManageCalendar(session, calendar)) {
      return forbidden("You can only edit calendars you created");
    }

    const { name, objective, startDate, endDate, status, plannedItems, buckets } = body;

    if (name !== undefined) {
      if (!name?.trim()) return NextResponse.json({ error: "name cannot be empty" }, { status: 400 });
      calendar.name = name.trim();
    }
    if (objective !== undefined)  calendar.objective = objective.trim();
    if (status !== undefined)     calendar.status    = status;
    if (startDate !== undefined)  calendar.startDate = new Date(startDate);
    if (endDate !== undefined)    calendar.endDate   = new Date(endDate);

    if (calendar.startDate > calendar.endDate) {
      return NextResponse.json({ error: "startDate must be before endDate" }, { status: 400 });
    }

    if (Array.isArray(buckets))      calendar.buckets      = buckets;

    if (Array.isArray(plannedItems)) {
      for (const item of plannedItems) {
        if (item.plannedQty > item.totalInScope) {
          return NextResponse.json(
            { error: `plannedQty (${item.plannedQty}) for "${item.label}" exceeds totalInScope (${item.totalInScope})` },
            { status: 400 }
          );
        }
      }
      calendar.plannedItems = plannedItems;
    }

    await calendar.save();

    return NextResponse.json({ ...calendar.toObject(), id: calendar._id.toString() });
  } catch (err: any) {
    console.error("[calendar PATCH]", err);
    return NextResponse.json({ error: err.message || "Internal error" }, { status: 500 });
  }
}

// DELETE /api/clients/[id]/calendars/[calId]
export async function DELETE(req: NextRequest, { params }: Ctx) {
  try {
    const session = await getSession();
    if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    if (isClient(session)) {
      const { id } = await params;
      if (!(await assertClientAccess(session, id))) return notFound();
    }

    const { id, calId } = await params;
    await connectDB();

    const calendar = await Calendar.findOne({ _id: calId, clientId: id });
    if (!calendar) {
      return NextResponse.json({ error: "Calendar not found" }, { status: 404 });
    }

    if (!canManageCalendar(session, calendar)) {
      return forbidden("You can only delete calendars you created");
    }

    // Cascade: delete every copy (deliverable) in this calendar along with its
    // drafts, files and history, so nothing is left orphaned. If calendar A has
    // 50 copies, all 50 are removed here before the calendar itself.
    const deliverables = await Deliverable.find({ calendarId: calId })
      .select("_id")
      .lean();

    for (const del of deliverables) {
      const drafts = await ContentDraft.find({ deliverableId: del._id }).lean();
      for (const draft of drafts) {
        await purgeDraft(draft as any);
      }
      // Safety net for copies that have no drafts yet — purgeDraft only removes
      // the deliverable when a draft references it.
      await Deliverable.deleteOne({ _id: del._id });
    }

    await Calendar.deleteOne({ _id: calId });

    return NextResponse.json({
      message: "Calendar deleted",
      deletedCopies: deliverables.length,
    });
  } catch (err: any) {
    console.error("[calendar DELETE]", err);
    return NextResponse.json({ error: err.message || "Internal error" }, { status: 500 });
  }
}
