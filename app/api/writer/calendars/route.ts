import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { isClient, forbidden } from "@/lib/authz";
import { connectDB } from "@/lib/db";
import Calendar from "@/lib/models/calendar.model";
import ScopeOfWork from "@/lib/models/scope-of-work.model";
import Deliverable from "@/lib/models/deliverable.model";
import mongoose from "mongoose";

// GET /api/writer/calendars
// Returns all calendars created by the logged-in user, across all clients.
// Query: ?module= &status=
export async function GET(req: NextRequest) {
  try {
    const session = await getSession();
    if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    if (isClient(session)) return forbidden();

    await connectDB();

    const { searchParams } = new URL(req.url);
    const module = searchParams.get("module");
    const status = searchParams.get("status");

    const filter: Record<string, any> = { createdBy: session.userId };
    if (module) filter.module = module;
    if (status) filter.status = status;

    const calendars = await Calendar.find(filter)
      .sort({ startDate: -1 })
      .populate("clientId", "name brandName")
      .populate("createdBy", "firstName lastName email")
      .lean();

    // Enrich with deliverable progress
    const calendarIds = calendars.map((c) => c._id);
    const deliverables = await Deliverable.find(
      { calendarId: { $in: calendarIds } },
      { calendarId: 1, status: 1 }
    ).lean();

    const enriched = calendars.map((cal) => {
      const calDels = deliverables.filter(
        (d) => d.calendarId.toString() === (cal._id as any).toString()
      );
      const totalPlanned   = (cal.plannedItems || []).reduce((s, i) => s + i.plannedQty, 0);
      const totalCreated   = calDels.length;
      const totalDelivered = calDels.filter((d) => d.status === "delivered").length;

      const clientDoc = cal.clientId as any;
      return {
        ...cal,
        id:         (cal._id as any).toString(),
        clientId:   clientDoc?._id?.toString() || cal.clientId?.toString() || "",
        clientName: clientDoc?.name || clientDoc?.brandName || "—",
        progress:   { totalPlanned, totalCreated, totalDelivered },
      };
    });

    return NextResponse.json(enriched);
  } catch (err: any) {
    console.error("[writer/calendars GET]", err);
    return NextResponse.json({ error: err.message || "Internal error" }, { status: 500 });
  }
}

// POST /api/writer/calendars
// Creates a calendar. clientId and scopeId must be provided in the body.
// Body: { clientId, scopeId, module, name, objective, startDate, endDate, status?, plannedItems }
export async function POST(req: NextRequest) {
  try {
    const session = await getSession();
    if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    if (isClient(session)) return forbidden();

    const body = await req.json();
    const { clientId, scopeId, module, name, objective, startDate, endDate, status, plannedItems } = body;

    if (!clientId || !scopeId || !module || !name?.trim() || !startDate || !endDate) {
      return NextResponse.json(
        { error: "clientId, scopeId, module, name, startDate, and endDate are required" },
        { status: 400 }
      );
    }

    if (new Date(startDate) > new Date(endDate)) {
      return NextResponse.json({ error: "startDate must be before endDate" }, { status: 400 });
    }

    await connectDB();

    // Block if a non-completed calendar already exists for this client+scope+module
    const existing = await Calendar.findOne({
      clientId: new mongoose.Types.ObjectId(clientId),
      scopeId:  new mongoose.Types.ObjectId(scopeId),
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

    const scope = await ScopeOfWork.findOne({
      _id: new mongoose.Types.ObjectId(scopeId),
      clientId: new mongoose.Types.ObjectId(clientId),
    }).lean();

    if (!scope) {
      return NextResponse.json({ error: "Scope of work not found" }, { status: 404 });
    }

    // Validate and resolve plannedItems
    const resolvedItems: any[] = [];
    if (Array.isArray(plannedItems) && plannedItems.length > 0) {
      for (const { scopeItemId, plannedQty } of plannedItems) {
        if (!scopeItemId || !plannedQty || plannedQty < 1) {
          return NextResponse.json(
            { error: "Each planned item requires scopeItemId and plannedQty >= 1" },
            { status: 400 }
          );
        }
        const scopeItem = (scope.items as any[]).find((i: any) => i.id === scopeItemId);
        if (!scopeItem) {
          return NextResponse.json(
            { error: `Scope item "${scopeItemId}" not found` },
            { status: 400 }
          );
        }
        const totalInScope = parseInt(scopeItem.unit) || 0;
        resolvedItems.push({
          scopeItemId,
          label:       scopeItem.label,
          type:        scopeItem.label,
          platforms:   scopeItem.platforms || [],
          plannedQty,
          totalInScope,
        });
      }
    }

    const calendar = await Calendar.create({
      clientId:    new mongoose.Types.ObjectId(clientId),
      scopeId:     new mongoose.Types.ObjectId(scopeId),
      createdBy:   session.userId,
      module,
      name:        name.trim(),
      objective:   objective?.trim() || "",
      startDate:   new Date(startDate),
      endDate:     new Date(endDate),
      status:      status || "draft",
      plannedItems: resolvedItems,
      buckets:     [],
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
    console.error("[writer/calendars POST]", err);
    return NextResponse.json({ error: err.message || "Internal error" }, { status: 500 });
  }
}
