import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { connectDB } from "@/lib/db";
import CalendarDeliverable from "@/lib/models/calendar-deliverable.model";
import { logActivity } from "@/lib/activity";

type Ctx = { params: Promise<{ id: string }> };

// GET /api/clients/[id]/deliverables - lists all deliverables for a client
export async function GET(req: NextRequest, { params }: Ctx) {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id: clientId } = await params;
    await connectDB();

    const deliverables = await CalendarDeliverable.find({ clientId }).sort({ scheduledDate: 1 }).lean();

    return NextResponse.json(
      deliverables.map((d) => ({
        ...d,
        id: d._id.toString(),
      }))
    );
  } catch (err: any) {
    console.error("[deliverables GET]", err);
    return NextResponse.json({ error: err.message || "Failed to fetch deliverables" }, { status: 500 });
  }
}

// POST /api/clients/[id]/deliverables - adds a custom deliverable to the calendar
export async function POST(req: NextRequest, { params }: Ctx) {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id: clientId } = await params;
    const body = await req.json();
    const { title, platform, type, scheduledDate, notes } = body;

    if (!title?.trim() || !platform || !type || !scheduledDate) {
      return NextResponse.json({ error: "Required fields are missing" }, { status: 400 });
    }

    await connectDB();

    const deliverable = await CalendarDeliverable.create({
      clientId,
      title: title.trim(),
      platform,
      type,
      status: "pending",
      scheduledDate: new Date(scheduledDate),
      notes: notes?.trim(),
    });

    await logActivity({ req, action: "CREATE_DELIVERABLE_SUCCESS", details: `Scheduled deliverable: ${deliverable.title} on ${deliverable.scheduledDate}`, status: 201 });

    return NextResponse.json({
      ...deliverable.toObject(),
      id: deliverable._id.toString(),
    }, { status: 201 });
  } catch (err: any) {
    console.error("[deliverables POST]", err);
    return NextResponse.json({ error: err.message || "Failed to create deliverable" }, { status: 500 });
  }
}

// PATCH /api/clients/[id]/deliverables - updates an existing calendar deliverable
export async function PATCH(req: NextRequest, { params }: Ctx) {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id: clientId } = await params;
    const body = await req.json();
    const { deliverableId, title, status, scheduledDate, completedDate, publishedUrl, notes, platform, type } = body;

    if (!deliverableId) {
      return NextResponse.json({ error: "Deliverable ID is required" }, { status: 400 });
    }

    await connectDB();

    const deliverable = await CalendarDeliverable.findOne({ _id: deliverableId, clientId });
    if (!deliverable) {
      return NextResponse.json({ error: "Deliverable not found" }, { status: 404 });
    }

    if (title !== undefined) deliverable.title = title.trim();
    if (platform !== undefined) deliverable.platform = platform;
    if (type !== undefined) deliverable.type = type;
    if (notes !== undefined) deliverable.notes = notes.trim() || undefined;

    if (scheduledDate !== undefined) {
      deliverable.scheduledDate = new Date(scheduledDate);
    }

    if (status !== undefined) {
      if (!["pending", "delivered"].includes(status)) {
        return NextResponse.json({ error: "Invalid status" }, { status: 400 });
      }
      deliverable.status = status;
      if (status === "delivered") {
        deliverable.completedDate = completedDate ? new Date(completedDate) : new Date();
        if (publishedUrl !== undefined) {
          deliverable.publishedUrl = publishedUrl.trim() || undefined;
        }
      } else {
        deliverable.completedDate = undefined;
        deliverable.publishedUrl = undefined;
      }
    } else {
      // Direct updates to url / date even without changing status
      if (publishedUrl !== undefined) deliverable.publishedUrl = publishedUrl.trim() || undefined;
      if (completedDate !== undefined) deliverable.completedDate = completedDate ? new Date(completedDate) : undefined;
    }

    await deliverable.save();

    await logActivity({ req, action: "UPDATE_DELIVERABLE_SUCCESS", details: `Updated deliverable: ${deliverable.title} (${deliverable.status})`, status: 200 });

    return NextResponse.json({
      ...deliverable.toObject(),
      id: deliverable._id.toString(),
    });
  } catch (err: any) {
    console.error("[deliverables PATCH]", err);
    return NextResponse.json({ error: err.message || "Failed to update deliverable" }, { status: 500 });
  }
}

// DELETE /api/clients/[id]/deliverables - deletes an existing deliverable
export async function DELETE(req: NextRequest, { params }: Ctx) {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id: clientId } = await params;
    const body = await req.json();
    const { deliverableId } = body;

    if (!deliverableId) {
      return NextResponse.json({ error: "Deliverable ID is required" }, { status: 400 });
    }

    await connectDB();

    const deliverable = await CalendarDeliverable.findOneAndDelete({ _id: deliverableId, clientId });
    if (!deliverable) {
      return NextResponse.json({ error: "Deliverable not found" }, { status: 404 });
    }

    await logActivity({ req, action: "DELETE_DELIVERABLE_SUCCESS", details: `Deleted deliverable: ${deliverable.title}`, status: 200 });

    return NextResponse.json({ message: "Deliverable deleted successfully" });
  } catch (err: any) {
    console.error("[deliverables DELETE]", err);
    return NextResponse.json({ error: err.message || "Failed to delete deliverable" }, { status: 500 });
  }
}
