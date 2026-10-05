import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { isClient, assertClientAccess, notFound } from "@/lib/authz";
import { connectDB } from "@/lib/db";
import Client from "@/lib/models/client.model";
import AIProject from "@/lib/models/ai/ai-project";
import { AIResearch } from "@/lib/models/ai/ai-research";
import { AIUsage } from "@/lib/models/ai/ai-usage";
import {
  selectCopyContext,
  CopywritingContextKey,
} from "@/lib/ai/context/context-selector";
import {
  generateSocialCopy,
  ContentCategory,
} from "@/lib/ai/writer/generate-copy";

type Ctx = { params: Promise<{ id: string }> };

// POST /api/clients/[id]/ai/copywriting
// Body: { category, selectedContext, customPrompt }
export async function POST(req: NextRequest, { params }: Ctx) {
  try {
    const session = await getSession();
    if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { id } = await params;
    if (isClient(session)) {
      if (!(await assertClientAccess(session, id))) return notFound();
    }

    const body = await req.json();
    const {
      category,
      selectedContext,
      customPrompt,
      frameCount,
    }: {
      category: ContentCategory;
      selectedContext: CopywritingContextKey[];
      customPrompt: string;
      frameCount?: number;
    } = body;

    if (!category || !customPrompt?.trim()) {
      return NextResponse.json(
        { error: "category and customPrompt are required" },
        { status: 400 }
      );
    }

    await connectDB();

    const client = await Client.findById(id).lean();
    if (!client) {
      return NextResponse.json({ error: "Client not found" }, { status: 404 });
    }

    const project = await AIProject.findOne({ clientId: id, status: "active" }).lean();

    // Copywriting reads from Phase 1 research — it does not trigger it.
    // Primary source is the project's persisted context (contextStatus "ready").
    // Fallback: some research was generated through the older "Feed to LLM" route
    // that saved finalAnalysis onto the AIResearch record but never backfilled
    // AIProject.context. finalAnalysis is the same shape as project.context, so
    // fall back to the latest completed research rather than 409-ing when research
    // demonstrably exists for this client.
    let savedContext: any =
      project?.contextStatus === "ready" ? project.context : null;

    if (!savedContext) {
      const latestResearch = await AIResearch.findOne({
        clientId: id,
        status: "completed",
      })
        .sort({ updatedAt: -1 })
        .select("finalAnalysis")
        .lean();

      savedContext = latestResearch?.finalAnalysis ?? null;
    }

    // If nothing's been run yet, tell the writer instead of silently
    // kicking off a multi-search bootstrap mid-writing-session.
    if (!savedContext) {
      return NextResponse.json(
        {
          error:
            "No client research on file yet. Run client research for this client before using Write with AI.",
        },
        { status: 409 }
      );
    }

    const context = selectCopyContext(savedContext, selectedContext ?? []);

    const result = await generateSocialCopy({
      clientName: client.brandName || client.name,
      category,
      customPrompt: customPrompt.trim(),
      context,
      frameCount: category === "carousel" ? frameCount : undefined,
    });

    await AIUsage.create({
      userId: session.userId,
      clientId: id,
      provider: "anthropic",
      model: process.env.AI_ANTHROPIC_MODEL || "claude-sonnet-5",
      operation: "social_copywriting",
      inputTokens: result.inputTokens,
      outputTokens: result.outputTokens,
      webSearchCount: 0,
      estimatedCost: 0,
    });

    return NextResponse.json({
      copy: result.copy,
      caption: result.caption,
      hashtags: result.hashtags,
      frames: result.frames,
    });
  } catch (err: any) {
    console.error("[ai copywriting POST]", err);
    return NextResponse.json({ error: err.message || "Internal error" }, { status: 500 });
  }
}