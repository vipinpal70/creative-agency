import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { connectDB } from "@/lib/db";
import GanttLink from "@/lib/models/gantt-link.model";

type Ctx = { params: Promise<{ clientId: string; id: string }> };

// PUT /api/gantt/[clientId]/links/[id]
export async function PUT(req: NextRequest, { params }: Ctx) {
  try {
    const session = await getSession();
    if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { clientId, id } = await params;
    const body = await req.json();
    const { source, target, type } = body;

    await connectDB();

    const link = await GanttLink.findOne({ _id: id, clientId });
    if (!link) return NextResponse.json({ error: "Link not found" }, { status: 404 });

    const update: Record<string, unknown> = {};
    if (source !== undefined) update.source = source;
    if (target !== undefined) update.target = target;
    if (type   !== undefined) update.type   = type;

    await GanttLink.findByIdAndUpdate(id, update);

    return NextResponse.json({ id });
  } catch (err: any) {
    console.error("[GANTT_LINK_PUT]", err);
    return NextResponse.json({ error: "Internal error" }, { status: 500 });
  }
}

// DELETE /api/gantt/[clientId]/links/[id]
export async function DELETE(_req: NextRequest, { params }: Ctx) {
  try {
    const session = await getSession();
    if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { clientId, id } = await params;
    await connectDB();

    await GanttLink.findOneAndDelete({ _id: id, clientId });

    return NextResponse.json({});
  } catch (err: any) {
    console.error("[GANTT_LINK_DELETE]", err);
    return NextResponse.json({ error: "Internal error" }, { status: 500 });
  }
}
