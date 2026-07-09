import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { isClient, forbidden } from "@/lib/authz";
import { connectDB } from "@/lib/db";
import Task, { normalizeTaskStatus, TASK_STATUSES } from "@/lib/models/task.model";
import mongoose from "mongoose";

function serializeTask(task: any) {
  const client = task.clientId as any;
  const assignedTo = task.assignedToId as any;
  return {
    id: task._id.toString(),
    title: task.title,
    description: task.description,
    status: normalizeTaskStatus(task.status),
    priority: task.priority,
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
    module: task.module ?? null,
    subTasks: task.subTasks ?? [],
  };
}

// GET /api/tasks
export async function GET(req: NextRequest) {
  try {
    const session = await getSession();
    if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    if (isClient(session)) return forbidden();

    await connectDB();
    const { searchParams } = new URL(req.url);
    const clientId = searchParams.get("clientId");
    const status = searchParams.get("status");

    const filter: Record<string, unknown> = {};
    if (clientId && mongoose.Types.ObjectId.isValid(clientId)) {
      filter.clientId = new mongoose.Types.ObjectId(clientId);
    }
    if (status) {
      const wanted = new Set(status.split(",").map((s) => s.trim().toUpperCase()));
      // Legacy statuses collapse into the three-column set, so match on the
      // normalized value rather than the raw stored one.
      filter.status = {
        $in: TASK_STATUSES.filter((s) => wanted.has(s)).flatMap((s) =>
          s === "OPEN"
            ? ["OPEN", "OPENED", "REJECTED"]
            : s === "IN_PROGRESS"
              ? ["IN_PROGRESS", "ON_HOLD", "INTERNAL_REVIEW", "CLIENT_REVIEW"]
              : ["CLOSED", "COMPLETED", "APPROVED"]
        ),
      };
    }

    const tasks = await Task.find(filter)
      .populate("clientId", "name brandName")
      .populate("assignedToId", "firstName lastName")
      .sort({ createdAt: -1 })
      .lean();

    return NextResponse.json(tasks.map(serializeTask));
  } catch (err: any) {
    console.error("[tasks GET]", err);
    return NextResponse.json({ error: err.message || "Internal server error" }, { status: 500 });
  }
}

// POST /api/tasks
export async function POST(req: NextRequest) {
  try {
    const session = await getSession();
    if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    if (isClient(session)) return forbidden();

    const body = await req.json();
    const { title, description, clientId, assignedToId, taskCategory, module, priority, endDate, organizationId } = body;

    if (!title?.trim()) {
      return NextResponse.json({ error: "Title is required" }, { status: 400 });
    }
    if (!clientId || !mongoose.Types.ObjectId.isValid(clientId)) {
      return NextResponse.json({ error: "Valid clientId is required" }, { status: 400 });
    }

    await connectDB();

    const task = await Task.create({
      title: title.trim(),
      description: description?.trim(),
      clientId: new mongoose.Types.ObjectId(clientId),
      assignedToId:
        assignedToId && mongoose.Types.ObjectId.isValid(assignedToId)
          ? new mongoose.Types.ObjectId(assignedToId)
          : undefined,
      category: taskCategory || undefined,
      module: module || undefined,
      priority: priority || "MEDIUM",
      endDate: endDate ? new Date(endDate) : undefined,
      organizationId: organizationId || "default-org",
      createdById:
        session.userId && mongoose.Types.ObjectId.isValid(session.userId)
          ? new mongoose.Types.ObjectId(session.userId)
          : undefined,
      status: "OPEN",
    });

    const populated = await Task.findById(task._id)
      .populate("clientId", "name brandName")
      .populate("assignedToId", "firstName lastName")
      .lean();

    return NextResponse.json(serializeTask(populated), { status: 201 });
  } catch (err: any) {
    console.error("[tasks POST]", err);
    return NextResponse.json({ error: err.message || "Internal server error" }, { status: 500 });
  }
}
