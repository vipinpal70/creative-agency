import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { isClient, assertClientAccess, notFound } from "@/lib/authz";
import { connectDB } from "@/lib/db";
import AIProject from "@/lib/models/ai/ai-project";
import { AIResearch } from "@/lib/models/ai/ai-research";

type Ctx = { params: Promise<{ id: string }> };

// GET /api/clients/[id]/ai/research-context
// Returns the saved client-research context (AIResearchResult shape) so the
// client Overview tab can render "LLM Insights". Does NOT trigger research —
// returns { context: null } when nothing has been run yet.
export async function GET(_req: NextRequest, { params }: Ctx) {
  try {
    const session = await getSession();
    if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { id } = await params;
    if (isClient(session)) {
      if (!(await assertClientAccess(session, id))) return notFound();
    }

    await connectDB();

    const project = await AIProject.findOne({ clientId: id, status: "active" }).lean();

    // Primary source is the project's persisted context (contextStatus "ready").
    // Fallback: the latest completed research's finalAnalysis (same shape) —
    // mirrors the copywriting route so older research still surfaces.
    let context: any =
      project?.contextStatus === "ready" ? project.context : null;
    let generatedAt: Date | null = project?.contextGeneratedAt ?? null;

    if (!context) {
      const latestResearch = await AIResearch.findOne({
        clientId: id,
        status: "completed",
      })
        .sort({ updatedAt: -1 })
        .select("finalAnalysis updatedAt")
        .lean();

      context = latestResearch?.finalAnalysis ?? null;
      generatedAt = latestResearch?.updatedAt ?? generatedAt;
    }

    return NextResponse.json({ context, generatedAt });
  } catch (err: any) {
    console.error("[ai research-context GET]", err);
    return NextResponse.json({ error: err.message || "Internal error" }, { status: 500 });
  }
}
