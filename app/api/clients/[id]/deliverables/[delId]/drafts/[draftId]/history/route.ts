import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { isClient, assertClientAccess, notFound } from "@/lib/authz";
import { connectDB } from "@/lib/db";
import DraftHistory from "@/lib/models/draft-history.model";

type Ctx = { params: Promise<{ id: string; delId: string; draftId: string }> };

// GET /api/clients/[id]/deliverables/[delId]/drafts/[draftId]/history
// Returns all history entries for a draft, newest first
export async function GET(req: NextRequest, { params }: Ctx) {
  try {
    const session = await getSession();
    if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    if (isClient(session)) {
      const { id } = await params;
      if (!(await assertClientAccess(session, id))) return notFound();
    }

    const { draftId } = await params;
    await connectDB();

    const entries = await DraftHistory.find({ draftId })
      .sort({ changedAt: -1 })
      .lean();

    return NextResponse.json(
      entries.map((e) => ({ ...e, id: (e._id as any).toString() }))
    );
  } catch (err: any) {
    console.error("[draft history GET]", err);
    return NextResponse.json({ error: err.message || "Internal error" }, { status: 500 });
  }
}
