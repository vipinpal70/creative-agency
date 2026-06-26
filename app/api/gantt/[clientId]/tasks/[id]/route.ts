import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { connectDB } from "@/lib/db";
import GanttTask from "@/lib/models/gantt-task.model";

type Ctx = { params: Promise<{ clientId: string; id: string }> };

const dateValue = (value: unknown) => {
  if (value === undefined || value === null || value === "") return undefined;
  const d = new Date(value as string);
  return Number.isNaN(d.getTime()) ? undefined : d.toISOString();
};

const normalizeParent = (value: unknown) => {
  if (value === undefined) return undefined;
  if (value === 0 || value === "0" || value === null || value === "") return null;
  return String(value);
};

// PUT /api/gantt/[clientId]/tasks/[id]
export async function PUT(req: NextRequest, { params }: Ctx) {
  try {
    const session = await getSession();
    if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { clientId, id } = await params;
    const body = await req.json();
    await connectDB();

    const task = await GanttTask.findOne({ _id: id, clientId });
    if (!task) return NextResponse.json({ error: "Task not found" }, { status: 404 });

    // ── Move/reorder operation ────────────────────────────────────────
    if (body.operation === "move") {
      const { mode, target } = body as { mode: "before" | "after" | "child"; target: string };

      if (mode === "child") {
        const childSiblings = await GanttTask.find({ clientId, parent: target }).lean();
        await GanttTask.findByIdAndUpdate(id, { parent: target, orderId: childSiblings.length });
      } else {
        const targetTask = await GanttTask.findOne({ _id: target, clientId });
        if (!targetTask) return NextResponse.json({ error: "Target not found" }, { status: 404 });

        const newParent  = targetTask.parent;
        const newOrderId = mode === "after" ? targetTask.orderId + 1 : targetTask.orderId;

        await GanttTask.updateMany(
          { clientId, parent: newParent, orderId: { $gte: newOrderId }, _id: { $ne: id } },
          { $inc: { orderId: 1 } }
        );
        await GanttTask.findByIdAndUpdate(id, { parent: newParent, orderId: newOrderId });
      }

      return NextResponse.json({ id });
    }

    // ── Normal update ─────────────────────────────────────────────────
    const {
      text,
      start,
      end,
      duration: rawDuration,
      progress: rawProgress,
      type,
      parent:   rawParent,
    } = body;

    const duration = rawDuration !== undefined ? Math.max(1, Math.round(Number(rawDuration))) : undefined;
    const progress = rawProgress !== undefined ? Math.min(1, Math.max(0, Number(rawProgress))) : undefined;
    const parent   = normalizeParent(rawParent);

    const update: Record<string, unknown> = {};
    if (text     !== undefined) update.text     = text;
    if (start    !== undefined) update.start    = new Date(start);
    if (end      !== undefined) update.end      = end ? new Date(end) : null;
    if (duration !== undefined) update.duration = duration;
    if (progress !== undefined) update.progress = progress;
    if (type     !== undefined) update.type     = type;
    if (parent   !== undefined) update.parent   = parent;

    await GanttTask.findByIdAndUpdate(id, update);

    return NextResponse.json({ id });
  } catch (err: any) {
    console.error("[GANTT_TASK_PUT]", err);
    return NextResponse.json({ error: "Internal error" }, { status: 500 });
  }
}

// DELETE /api/gantt/[clientId]/tasks/[id]
export async function DELETE(_req: NextRequest, { params }: Ctx) {
  try {
    const session = await getSession();
    if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { clientId, id } = await params;
    await connectDB();

    await GanttTask.findOneAndDelete({ _id: id, clientId });

    return NextResponse.json({});
  } catch (err: any) {
    console.error("[GANTT_TASK_DELETE]", err);
    return NextResponse.json({ error: "Internal error" }, { status: 500 });
  }
}
