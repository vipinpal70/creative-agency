import { NextRequest, NextResponse } from "next/server";
import { randomUUID } from "crypto";
import { getSession } from "@/lib/auth";
import { isClient, assertClientAccess, notFound } from "@/lib/authz";
import { connectDB } from "@/lib/db";
import ScopeOfWork from "@/lib/models/scope-of-work.model";

type Ctx = { params: Promise<{ id: string; scopeId: string }> };

// PATCH /api/clients/[id]/scope/[scopeId]
// Edits an existing scope record after it has been created (period, label, items).
export async function PATCH(req: NextRequest, { params }: Ctx) {
  try {
    const session = await getSession();
    if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    if (isClient(session)) {
      const { id } = await params;
      if (!(await assertClientAccess(session, id))) return notFound();
    }

    const { id, scopeId } = await params;
    const body = await req.json();
    await connectDB();

    const scope = await ScopeOfWork.findOne({ _id: scopeId, clientId: id });
    if (!scope) {
      return NextResponse.json({ error: "Scope of work not found" }, { status: 404 });
    }

    if (body.period !== undefined) scope.period = body.period?.trim() || "";
    if (body.label !== undefined) scope.label = body.label?.trim() || "";

    if (Array.isArray(body.items)) {
      // Preserve each item's id (and its `delivered` count) where possible so
      // progress tracking survives an edit; mint ids only for brand-new rows.
      const existingById = new Map(
        (scope.items || []).map((it: any) => [it.id, it])
      );
      scope.items = body.items.map((item: any) => {
        const prev = item.id ? existingById.get(item.id) : undefined;
        return {
          id: item.id || randomUUID(),
          module: item.module,
          label: item.label,
          unit: item.unit ?? "0",
          platforms: item.platforms || [],
          delivered: item.delivered ?? prev?.delivered ?? 0,
        };
      });
    }

    await scope.save();

    return NextResponse.json({ ...scope.toObject(), id: scope._id.toString() });
  } catch (err: any) {
    console.error("[scope PATCH]", err);
    return NextResponse.json({ error: err.message || "Internal error" }, { status: 500 });
  }
}

// DELETE /api/clients/[id]/scope/[scopeId] — removes a scope record.
export async function DELETE(req: NextRequest, { params }: Ctx) {
  try {
    const session = await getSession();
    if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    if (isClient(session)) {
      const { id } = await params;
      if (!(await assertClientAccess(session, id))) return notFound();
    }

    const { id, scopeId } = await params;
    await connectDB();

    const deleted = await ScopeOfWork.findOneAndDelete({ _id: scopeId, clientId: id });
    if (!deleted) {
      return NextResponse.json({ error: "Scope of work not found" }, { status: 404 });
    }

    return NextResponse.json({ message: "Scope deleted" });
  } catch (err: any) {
    console.error("[scope DELETE]", err);
    return NextResponse.json({ error: err.message || "Internal error" }, { status: 500 });
  }
}
