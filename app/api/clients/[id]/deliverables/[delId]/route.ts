import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { connectDB } from "@/lib/db";
import Deliverable from "@/lib/models/deliverable.model";
import type { DeliverableStatus } from "@/lib/models/deliverable.model";

type Ctx = { params: Promise<{ id: string; delId: string }> };

const VALID_STATUSES: DeliverableStatus[] = [
  "pending", "in_progress", "internal_review", "client_review", "approved", "delivered",
];

// GET /api/clients/[id]/deliverables/[delId]
export async function GET(req: NextRequest, { params }: Ctx) {
  try {
    const session = await getSession();
    if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { id, delId } = await params;
    await connectDB();

    const deliverable = await Deliverable.findOne({ _id: delId, clientId: id }).lean();
    if (!deliverable) {
      return NextResponse.json({ error: "Deliverable not found" }, { status: 404 });
    }

    return NextResponse.json({ ...deliverable, id: (deliverable._id as any).toString() });
  } catch (err: any) {
    console.error("[deliverable GET]", err);
    return NextResponse.json({ error: err.message || "Internal error" }, { status: 500 });
  }
}

// PATCH /api/clients/[id]/deliverables/[delId]
// Updatable: title, status, platforms, type, buckets, scheduledDate,
//            assignedTeam, publishedUrl, deliveredAt, notes
export async function PATCH(req: NextRequest, { params }: Ctx) {
  try {
    const session = await getSession();
    if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { id, delId } = await params;
    const body = await req.json();
    await connectDB();

    const deliverable = await Deliverable.findOne({ _id: delId, clientId: id });
    if (!deliverable) {
      return NextResponse.json({ error: "Deliverable not found" }, { status: 404 });
    }

    const {
      title, status, platforms, type, buckets,
      scheduledDate, assignedTeam, publishedUrl, deliveredAt, notes,
    } = body;

    if (title !== undefined)          deliverable.title     = title.trim();
    if (Array.isArray(platforms))     deliverable.platforms = platforms;
    if (type !== undefined)           deliverable.type      = type;
    if (notes !== undefined)         deliverable.notes         = notes?.trim() || "";
    if (publishedUrl !== undefined)  deliverable.publishedUrl  = publishedUrl?.trim() || undefined;
    if (scheduledDate !== undefined) deliverable.scheduledDate = new Date(scheduledDate);
    if (Array.isArray(buckets))      deliverable.buckets       = buckets;
    if (Array.isArray(assignedTeam)) deliverable.assignedTeam  = assignedTeam;

    if (status !== undefined) {
      if (!VALID_STATUSES.includes(status)) {
        return NextResponse.json(
          { error: `Invalid status. Must be one of: ${VALID_STATUSES.join(", ")}` },
          { status: 400 }
        );
      }
      deliverable.status = status;
      // Auto-stamp deliveredAt when marked delivered
      if (status === "delivered" && !deliverable.deliveredAt) {
        deliverable.deliveredAt = deliveredAt ? new Date(deliveredAt) : new Date();
      }
      // Clear deliveredAt if pulled back from delivered
      if (status !== "delivered") {
        deliverable.deliveredAt = undefined;
      }
    }

    await deliverable.save();

    return NextResponse.json({ ...deliverable.toObject(), id: deliverable._id.toString() });
  } catch (err: any) {
    console.error("[deliverable PATCH]", err);
    return NextResponse.json({ error: err.message || "Internal error" }, { status: 500 });
  }
}

// DELETE /api/clients/[id]/deliverables/[delId]
export async function DELETE(req: NextRequest, { params }: Ctx) {
  try {
    const session = await getSession();
    if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { id, delId } = await params;
    await connectDB();

    const deliverable = await Deliverable.findOneAndDelete({ _id: delId, clientId: id });
    if (!deliverable) {
      return NextResponse.json({ error: "Deliverable not found" }, { status: 404 });
    }

    return NextResponse.json({ message: "Deliverable deleted" });
  } catch (err: any) {
    console.error("[deliverable DELETE]", err);
    return NextResponse.json({ error: err.message || "Internal error" }, { status: 500 });
  }
}
