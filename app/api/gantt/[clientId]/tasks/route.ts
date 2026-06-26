import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { connectDB } from "@/lib/db";
import GanttTask from "@/lib/models/gantt-task.model";
import mongoose from "mongoose";

type Ctx = { params: Promise<{ clientId: string }> };

// GET /api/gantt/[clientId]/tasks
export async function GET(_req: NextRequest, { params }: Ctx) {
  try {
    const session = await getSession();
    if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { clientId } = await params;
    await connectDB();

    const tasks = await GanttTask.find({ clientId })
      .sort({ orderId: 1 })
      .lean();

    return NextResponse.json(
      tasks.map((t) => ({ ...t, id: (t._id as mongoose.Types.ObjectId).toString() }))
    );
  } catch (err: any) {
    console.error("[GANTT_TASKS_GET]", err);
    return NextResponse.json({ error: "Internal error" }, { status: 500 });
  }
}

// POST /api/gantt/[clientId]/tasks
export async function POST(req: NextRequest, { params }: Ctx) {
  try {
    const session = await getSession();
    if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { clientId } = await params;
    const body = await req.json();
    const {
      text = "New Task",
      start,
      end,
      duration:  rawDuration = 1,
      progress:  rawProgress = 0,
      type = "task",
      parent:    rawParent,
      mode,
      target,
    } = body;

    const duration = Math.max(1, Math.round(Number(rawDuration)));
    const progress = Math.min(1, Math.max(0, Number(rawProgress)));
    const parent   = (rawParent === 0 || rawParent === "0") ? null : (rawParent || null);

    await connectDB();

    // Calculate orderId based on insertion mode
    let orderId = 0;
    const siblings = await GanttTask.find({ clientId, parent: parent ?? null }).sort({ orderId: 1 }).lean();

    if (mode === "before" && target) {
      const targetTask = siblings.find((t) => (t._id as any).toString() === target);
      orderId = targetTask ? targetTask.orderId : 0;
      await GanttTask.updateMany({ clientId, orderId: { $gte: orderId } }, { $inc: { orderId: 1 } });
    } else if (mode === "after" && target) {
      const targetTask = siblings.find((t) => (t._id as any).toString() === target);
      orderId = targetTask ? targetTask.orderId + 1 : siblings.length;
      await GanttTask.updateMany({ clientId, orderId: { $gte: orderId } }, { $inc: { orderId: 1 } });
    } else if (mode === "child" && target) {
      const childSiblings = await GanttTask.find({ clientId, parent: target }).lean();
      orderId = childSiblings.length;
    } else {
      orderId = siblings.length;
    }

    const task = await GanttTask.create({
      text,
      start:    start ? new Date(start) : new Date(),
      end:      end ? new Date(end) : null,
      duration,
      progress,
      type,
      parent:   mode === "child" && target ? target : (parent ?? null),
      orderId,
      clientId,
    });

    return NextResponse.json({ id: task._id.toString() }, { status: 201 });
  } catch (err: any) {
    console.error("[GANTT_TASKS_POST]", err);
    return NextResponse.json({ error: "Internal error" }, { status: 500 });
  }
}
