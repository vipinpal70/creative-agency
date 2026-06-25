import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { connectDB } from "@/lib/db";
import Calendar from "@/lib/models/calendar.model";
import ScopeOfWork from "@/lib/models/scope-of-work.model";
import Deliverable from "@/lib/models/deliverable.model";
import mongoose from "mongoose";

type Ctx = { params: Promise<{ id: string }> };

// GET /api/clients/[id]/calendars
// Query: ?module=  ?scopeId=  ?status=  ?createdBy=me
export async function GET(req: NextRequest, { params }: Ctx) {
  try {
    const session = await getSession();
    if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { id } = await params;
    await connectDB();

    const { searchParams } = new URL(req.url);
    const module    = searchParams.get("module");
    const scopeId   = searchParams.get("scopeId");
    const status    = searchParams.get("status");
    const createdBy = searchParams.get("createdBy");

    const filter: Record<string, any> = { clientId: id };
    if (module)                    filter.module    = module;
    if (scopeId)                   filter.scopeId   = scopeId;
    if (status)                    filter.status    = status;
    if (createdBy === "me")        filter.createdBy = session.userId;

    const calendars = await Calendar.find(filter)
      .sort({ startDate: -1 })
      .populate("createdBy", "firstName lastName email")
      .lean();

    // For each calendar, attach deliverable progress per planned item
    const calendarIds = calendars.map((c) => c._id);
    const deliverables = await Deliverable.find(
      { calendarId: { $in: calendarIds } },
      { calendarId: 1, status: 1 }
    ).lean();

    const enriched = calendars.map((cal) => {
      const calDels = deliverables.filter(
        (d) => d.calendarId.toString() === (cal._id as any).toString()
      );
      const totalPlanned   = cal.plannedItems.reduce((s, i) => s + i.plannedQty, 0);
      const totalCreated   = calDels.length;
      const totalDelivered = calDels.filter((d) => d.status === "delivered").length;

      return {
        ...cal,
        id: (cal._id as any).toString(),
        progress: { totalPlanned, totalCreated, totalDelivered },
      };
    });

    return NextResponse.json(enriched);
  } catch (err: any) {
    console.error("[calendars GET]", err);
    return NextResponse.json({ error: err.message || "Internal error" }, { status: 500 });
  }
}

// POST /api/clients/[id]/calendars
// Body: {
//   scopeId, module, name, objective,
//   startDate, endDate, status?,
//   plannedItems: [{ scopeItemId, plannedQty }]
// }
// createdBy is auto-set from session
export async function POST(req: NextRequest, { params }: Ctx) {
  try {
    const session = await getSession();
    if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { id } = await params;
    const body = await req.json();
    const { scopeId, module, name, objective, startDate, endDate, status, plannedItems } = body;

    if (!scopeId || !module || !name?.trim() || !startDate || !endDate) {
      return NextResponse.json(
        { error: "scopeId, module, name, startDate, and endDate are required" },
        { status: 400 }
      );
    }

    if (new Date(startDate) > new Date(endDate)) {
      return NextResponse.json(
        { error: "startDate must be before endDate" },
        { status: 400 }
      );
    }

    await connectDB();

    // Block if a non-completed calendar already exists for this client+scope+module
    const existing = await Calendar.findOne({
      clientId: id,
      scopeId,
      module,
      status: { $in: ["draft", "active", "paused"] },
    }).lean();
    if (existing) {
      return NextResponse.json(
        {
          error: `A calendar for this module already exists and is currently "${existing.status}". Complete it before creating a new one.`,
          existingCalendarId: (existing._id as any).toString(),
        },
        { status: 409 }
      );
    }

    // Verify the scope belongs to this client
    const scope = await ScopeOfWork.findOne({
      _id: new mongoose.Types.ObjectId(scopeId),
      clientId: id,
    }).lean();

    if (!scope) {
      return NextResponse.json(
        { error: "Scope of work not found for this client" },
        { status: 404 }
      );
    }

    // Build and validate plannedItems against scope
    const resolvedItems: any[] = [];

    if (Array.isArray(plannedItems) && plannedItems.length > 0) {
      for (const incoming of plannedItems) {
        const { scopeItemId, plannedQty } = incoming;

        if (!scopeItemId || !plannedQty || plannedQty < 1) {
          return NextResponse.json(
            { error: `Each planned item needs a scopeItemId and plannedQty >= 1` },
            { status: 400 }
          );
        }

        // Find matching scope item
        const scopeItem = (scope.items as any[]).find((i: any) => i.id === scopeItemId);
        if (!scopeItem) {
          return NextResponse.json(
            { error: `Scope item "${scopeItemId}" not found in this scope of work` },
            { status: 400 }
          );
        }

        const totalInScope = parseInt(scopeItem.unit) || 0;

        resolvedItems.push({
          scopeItemId,
          label:       scopeItem.label,
          type:        scopeItem.label,  // label doubles as type key (e.g. "reel/story")
          platforms:   scopeItem.platforms || [],
          plannedQty,
          totalInScope,
        });
      }
    }

    const calendar = await Calendar.create({
      clientId:    id,
      scopeId,
      createdBy:   session.userId,
      module,
      name:        name.trim(),
      objective:   objective?.trim() || "",
      startDate:   new Date(startDate),
      endDate:     new Date(endDate),
      status:      status || "draft",
      plannedItems: resolvedItems,
    });

    return NextResponse.json(
      { ...calendar.toObject(), id: calendar._id.toString() },
      { status: 201 }
    );
  } catch (err: any) {
    if (err.code === 11000) {
      return NextResponse.json(
        { error: "A calendar for this module is already active. Complete it before creating a new one." },
        { status: 409 }
      );
    }
    console.error("[calendars POST]", err);
    return NextResponse.json({ error: err.message || "Internal error" }, { status: 500 });
  }
}
