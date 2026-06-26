import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { connectDB } from "@/lib/db";
import GanttTask from "@/lib/models/gantt-task.model";
import GanttLink from "@/lib/models/gantt-link.model";

type Ctx = { params: Promise<{ clientId: string }> };

// POST /api/gantt/[clientId]/duplicate
// Body: { targetClientId: string }
// Copies all gantt tasks + links from clientId into targetClientId.
// Old task IDs are remapped so link source/target references stay valid.
export async function POST(req: NextRequest, { params }: Ctx) {
  try {
    const session = await getSession();
    if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { clientId } = await params;
    const body = await req.json();
    const { targetClientId } = body;

    if (!targetClientId) {
      return NextResponse.json({ error: "targetClientId is required" }, { status: 400 });
    }
    if (targetClientId === clientId) {
      return NextResponse.json({ error: "Cannot duplicate into the same client" }, { status: 400 });
    }

    await connectDB();

    const [sourceTasks, sourceLinks] = await Promise.all([
      GanttTask.find({ clientId }).sort({ orderId: 1 }).lean(),
      GanttLink.find({ clientId }).lean(),
    ]);

    // Get current max orderId in target so we can append without collision
    const lastTask = await GanttTask.findOne({ clientId: targetClientId })
      .sort({ orderId: -1 })
      .select("orderId")
      .lean();
    const orderOffset = lastTask ? lastTask.orderId + 1 : 0;

    const idMap = new Map<string, string>();

    for (const task of sourceTasks) {
      const created = await GanttTask.create({
        text:     task.text,
        start:    task.start,
        end:      task.end ?? null,
        duration: task.duration,
        progress: task.progress,
        type:     task.type,
        parent:   task.parent ? idMap.get(task.parent) ?? null : null,
        orderId:  task.orderId + orderOffset,
        clientId: targetClientId,
      });
      idMap.set((task._id as any).toString(), created._id.toString());
    }

    let copiedLinks = 0;
    for (const link of sourceLinks) {
      const newSource = idMap.get(link.source);
      const newTarget = idMap.get(link.target);
      if (newSource && newTarget) {
        await GanttLink.create({
          source:   newSource,
          target:   newTarget,
          type:     link.type,
          clientId: targetClientId,
        });
        copiedLinks++;
      }
    }

    return NextResponse.json({
      success:        true,
      copiedTasks:    idMap.size,
      copiedLinks,
      targetClientId,
    });
  } catch (err: any) {
    console.error("[GANTT_DUPLICATE_POST]", err);
    return NextResponse.json({ error: "Internal error" }, { status: 500 });
  }
}
