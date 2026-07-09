import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { isClient, forbidden, assertClientAccess, notFound } from "@/lib/authz";
import { connectDB } from "@/lib/db";
import GanttLink from "@/lib/models/gantt-link.model";
import mongoose from "mongoose";

type Ctx = { params: Promise<{ clientId: string }> };

// GET /api/gantt/[clientId]/links
export async function GET(_req: NextRequest, { params }: Ctx) {
  try {
    const session = await getSession();
    if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { clientId } = await params;
    await connectDB();

    // Clients may only read links for their own gantt chart.
    if (!(await assertClientAccess(session, clientId))) return notFound();

    const links = await GanttLink.find({ clientId }).lean();

    return NextResponse.json(
      links.map((l) => ({ ...l, id: (l._id as mongoose.Types.ObjectId).toString() }))
    );
  } catch (err: any) {
    console.error("[GANTT_LINKS_GET]", err);
    return NextResponse.json({ error: "Internal error" }, { status: 500 });
  }
}

// POST /api/gantt/[clientId]/links
export async function POST(req: NextRequest, { params }: Ctx) {
  try {
    const session = await getSession();
    if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    // Staff-only: clients cannot create gantt links.
    if (isClient(session)) {
      const { clientId } = await params;
      if (!(await assertClientAccess(session, clientId))) return notFound();
    }

    const { clientId } = await params;
    const body = await req.json();
    const { source, target, type = "e2s" } = body;

    if (!source || !target) {
      return NextResponse.json({ error: "Missing required fields: source, target" }, { status: 400 });
    }

    await connectDB();

    const link = await GanttLink.create({ source, target, type, clientId });

    return NextResponse.json({ id: link._id.toString() }, { status: 201 });
  } catch (err: any) {
    console.error("[GANTT_LINKS_POST]", err);
    return NextResponse.json({ error: "Internal error" }, { status: 500 });
  }
}
