import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { connectDB } from "@/lib/db";
import ScopeOfWork from "@/lib/models/scope-of-work.model";

type Ctx = { params: Promise<{ id: string }> };

// GET /api/clients/[id]/scope — returns all scope records for this client (newest first)
export async function GET(req: NextRequest, { params }: Ctx) {
  try {
    const session = await getSession();
    if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { id } = await params;
    await connectDB();

    const scopes = await ScopeOfWork.find({ clientId: id })
      .sort({ isActive: -1, createdAt: -1 })
      .lean();

    return NextResponse.json(
      scopes.map((s) => ({ ...s, id: (s._id as any).toString() }))
    );
  } catch (err: any) {
    console.error("[scope GET]", err);
    return NextResponse.json({ error: err.message || "Internal error" }, { status: 500 });
  }
}

// POST /api/clients/[id]/scope — creates a new active scope, archives previous active
export async function POST(req: NextRequest, { params }: Ctx) {
  try {
    const session = await getSession();
    if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { id } = await params;
    const body = await req.json();
    await connectDB();

    // Archive all existing active scopes
    await ScopeOfWork.updateMany({ clientId: id, isActive: true }, { isActive: false });

    const scope = await ScopeOfWork.create({
      clientId: id,
      period: body.period?.trim() || "",
      label: body.label?.trim() || "",
      isActive: true,
      items: body.items || [],
    });

    return NextResponse.json({ ...scope.toObject(), id: scope._id.toString() }, { status: 201 });
  } catch (err: any) {
    console.error("[scope POST]", err);
    return NextResponse.json({ error: err.message || "Internal error" }, { status: 500 });
  }
}
