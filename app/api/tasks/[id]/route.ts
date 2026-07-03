import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { connectDB } from "@/lib/db";
import Task from "@/lib/models/task.model";
import mongoose from "mongoose";

type Ctx = { params: Promise<{ id: string }> };

function serializeTask(task: any) {
  const client = task.clientId as any;
  const assignedTo = task.assignedToId as any;
  return {
    id: task._id.toString(),
    title: task.title,
    description: task.description,
    status: task.status,
    priority: task.priority,
    startDate: task.startDate?.toISOString() ?? null,
    endDate: task.endDate?.toISOString() ?? null,
    clientId: client?._id?.toString() ?? task.clientId?.toString() ?? null,
    organizationId: task.organizationId,
    mediaUrls: task.mediaUrls ?? [],
    feedbacks: task.feedbacks ?? [],
    countSubTask: task.subTasks?.length ?? task.countSubTask ?? 0,
    client: {
      companyName: client?.brandName || client?.name || "—",
    },
    assignedTo: assignedTo
      ? {
          id: assignedTo._id.toString(),
          name: `${assignedTo.firstName} ${assignedTo.lastName || ""}`.trim(),
        }
      : null,
    category: task.category ?? null,
    subTasks: task.subTasks ?? [],
    comments: task.comments ?? [],
  };
}

// GET /api/tasks/[id]
export async function GET(_req: NextRequest, { params }: Ctx) {
  try {
    const session = await getSession();
    if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { id } = await params;
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return NextResponse.json({ error: "Invalid task ID" }, { status: 400 });
    }

    await connectDB();
    const task = await Task.findById(id)
      .populate("clientId", "name brandName")
      .populate("assignedToId", "firstName lastName")
      .lean();

    if (!task) return NextResponse.json({ error: "Task not found" }, { status: 404 });

    return NextResponse.json(serializeTask(task));
  } catch (err: any) {
    console.error("[task GET]", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

// PATCH /api/tasks/[id]
export async function PATCH(req: NextRequest, { params }: Ctx) {
  try {
    const session = await getSession();
    if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { id } = await params;
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return NextResponse.json({ error: "Invalid task ID" }, { status: 400 });
    }

    await connectDB();
    const body = await req.json();
    const { title, description, status, priority, startDate, endDate, assignedToId, category, feedbacks, newFeedback } = body;

    const setOp: Record<string, unknown> = {};
    const pushOp: Record<string, unknown> = {};

    if (title !== undefined) setOp.title = title;
    if (description !== undefined) setOp.description = description;
    if (status !== undefined) setOp.status = status;
    if (priority !== undefined) setOp.priority = priority;
    if (startDate !== undefined) setOp.startDate = startDate ? new Date(startDate) : null;
    if (endDate !== undefined) setOp.endDate = endDate ? new Date(endDate) : null;
    if (category !== undefined) setOp.category = category;
    if (feedbacks !== undefined) setOp.feedbacks = feedbacks;
    if (assignedToId !== undefined) {
      setOp.assignedToId =
        assignedToId && mongoose.Types.ObjectId.isValid(assignedToId)
          ? new mongoose.Types.ObjectId(assignedToId)
          : null;
    }
    if (newFeedback) pushOp.feedbacks = newFeedback;

    const mongoUpdate: Record<string, unknown> = {};
    if (Object.keys(setOp).length > 0) mongoUpdate.$set = setOp;
    if (Object.keys(pushOp).length > 0) mongoUpdate.$push = pushOp;

    const task = await Task.findByIdAndUpdate(id, mongoUpdate, { new: true })
      .populate("clientId", "name brandName")
      .populate("assignedToId", "firstName lastName")
      .lean();

    if (!task) return NextResponse.json({ error: "Task not found" }, { status: 404 });

    return NextResponse.json(serializeTask(task));
  } catch (err: any) {
    console.error("[task PATCH]", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

// DELETE /api/tasks/[id]
export async function DELETE(_req: NextRequest, { params }: Ctx) {
  try {
    const session = await getSession();
    if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { id } = await params;
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return NextResponse.json({ error: "Invalid task ID" }, { status: 400 });
    }

    await connectDB();
    const task = await Task.findByIdAndDelete(id);
    if (!task) return NextResponse.json({ error: "Task not found" }, { status: 404 });

    return NextResponse.json({ success: true });
  } catch (err: any) {
    console.error("[task DELETE]", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
