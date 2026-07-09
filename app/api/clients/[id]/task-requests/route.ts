import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { isClient, assertClientAccess, notFound } from "@/lib/authz";
import { connectDB } from "@/lib/db";
import ClientTaskRequest from "@/lib/models/client-task-request.model";
import CalendarDeliverable from "@/lib/models/calendar-deliverable.model";
import { logActivity } from "@/lib/activity";

type Ctx = { params: Promise<{ id: string }> };

// GET /api/clients/[id]/task-requests - lists all requested tasks
export async function GET(req: NextRequest, { params }: Ctx) {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    if (isClient(session)) {
      const { id } = await params;
      if (!(await assertClientAccess(session, id))) return notFound();
    }

    const { id: clientId } = await params;
    await connectDB();

    const tasks = await ClientTaskRequest.find({ clientId })
      .populate("requestedBy", "firstName lastName email roles")
      .sort({ createdAt: -1 })
      .lean();

    return NextResponse.json(
      tasks.map((t) => ({
        ...t,
        id: t._id.toString(),
      }))
    );
  } catch (err: any) {
    console.error("[task-requests GET]", err);
    return NextResponse.json({ error: err.message || "Failed to fetch task requests" }, { status: 500 });
  }
}

// POST /api/clients/[id]/task-requests - requests a new task from client or team
export async function POST(req: NextRequest, { params }: Ctx) {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    if (isClient(session)) {
      const { id } = await params;
      if (!(await assertClientAccess(session, id))) return notFound();
    }

    const { id: clientId } = await params;
    const body = await req.json();
    const { title, description, dueDate } = body;

    if (!title?.trim() || !description?.trim()) {
      return NextResponse.json({ error: "Title and description are required" }, { status: 400 });
    }

    await connectDB();

    const task = await ClientTaskRequest.create({
      clientId,
      requestedBy: session.userId,
      title: title.trim(),
      description: description.trim(),
      status: "pending",
      dueDate: dueDate ? new Date(dueDate) : undefined,
    });

    await logActivity({ req, action: "CREATE_TASK_REQUEST_SUCCESS", details: `Requested client task: ${task.title}`, status: 201 });

    return NextResponse.json({
      ...task.toObject(),
      id: task._id.toString(),
    }, { status: 201 });
  } catch (err: any) {
    console.error("[task-requests POST]", err);
    return NextResponse.json({ error: err.message || "Failed to create task request" }, { status: 500 });
  }
}

// PATCH /api/clients/[id]/task-requests - admin updates task request status (approve/reject/complete)
export async function PATCH(req: NextRequest, { params }: Ctx) {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    if (isClient(session)) {
      const { id } = await params;
      if (!(await assertClientAccess(session, id))) return notFound();
    }

    const { id: clientId } = await params;
    const body = await req.json();
    const { taskId, status } = body;

    if (!taskId || !status) {
      return NextResponse.json({ error: "Task ID and status are required" }, { status: 400 });
    }

    if (!["pending", "approved", "rejected", "in-progress", "completed"].includes(status)) {
      return NextResponse.json({ error: "Invalid status" }, { status: 400 });
    }

    await connectDB();

    const task = await ClientTaskRequest.findOne({ _id: taskId, clientId });
    if (!task) {
      return NextResponse.json({ error: "Task request not found" }, { status: 404 });
    }

    const oldStatus = task.status;
    task.status = status;
    await task.save();

    // If task is approved and was not approved previously, auto-create a custom calendar deliverable!
    if (status === "approved" && oldStatus !== "approved") {
      await CalendarDeliverable.create({
        clientId,
        title: `Requested Task: ${task.title}`,
        platform: "custom",
        type: "custom",
        status: "pending",
        scheduledDate: task.dueDate || new Date(),
        notes: `Task description: ${task.description}`,
      });
    }

    await logActivity({ req, action: "UPDATE_TASK_REQUEST_SUCCESS", details: `Updated task request ${task.title} status to ${status}`, status: 200 });

    return NextResponse.json({
      ...task.toObject(),
      id: task._id.toString(),
    });
  } catch (err: any) {
    console.error("[task-requests PATCH]", err);
    return NextResponse.json({ error: err.message || "Failed to update task request" }, { status: 500 });
  }
}
