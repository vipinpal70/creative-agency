import { NextRequest, NextResponse } from "next/server";
import mongoose from "mongoose";
import { getSession } from "@/lib/auth";
import { isStaff, forbidden } from "@/lib/authz";
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

import { resolveTextLLM } from "@/lib/ai/llm/resolve";
import { llmErrorResponse } from "@/lib/ai/llm/http";

type Ctx = { params: Promise<{ id: string }> };

export const maxDuration = 120;

// POST /api/clients/[id]/ai/copywriting
// Body: { category, selectedContext, customPrompt }
export async function POST(req: NextRequest, { params }: Ctx) {
  try {
    const session = await getSession();
    if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    // Staff only: the client portal has no AI writer, and every call is
    // billed to the workspace's provider key.
    if (!isStaff(session)) return forbidden();

    const { id } = await params;
    if (!mongoose.isValidObjectId(id)) {
      return NextResponse.json({ error: "Invalid client id" }, { status: 400 });
    }

    const body = await req.json();
    const {
      category,
      selectedContext,
      customPrompt,
      frameCount,
      mode = "generate",
      existing,
      instruction,
    }: {
      category: ContentCategory;
      selectedContext: CopywritingContextKey[];
      customPrompt: string;
      frameCount?: number;
      mode?: "generate" | "refine";
      existing?: {
        copy?: string;
        caption?: string;
        hashtags?: string[];
        frames?: { frameNo: number; copy: string }[];
      };
      instruction?: string;
    } = body;

    const isRefine = mode === "refine";

    // Generate needs the initial instructions; refine needs the feedback
    // (and the existing content to revise).
    if (!category) {
      return NextResponse.json({ error: "category is required" }, { status: 400 });
    }
    if (isRefine ? !instruction?.trim() : !customPrompt?.trim()) {
      return NextResponse.json(
        { error: isRefine ? "instruction is required to refine" : "customPrompt is required" },
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

    const llm = await resolveTextLLM();

    const result = await generateSocialCopy({
      llm,
      clientName: client.brandName || client.name,
      category,
      customPrompt: (customPrompt ?? "").trim(),
      context,
      frameCount: category === "carousel" ? frameCount : undefined,
      mode,
      existing,
      instruction: instruction?.trim(),
    });

    await AIUsage.create({
      userId: session.userId,
      clientId: id,
      provider: result.provider,
      model: result.model,
      operation: isRefine ? "social_copywriting_refine" : "social_copywriting",
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
    const llmResponse = llmErrorResponse(err, "ai copywriting POST");
    if (llmResponse) return llmResponse;
    return NextResponse.json({ error: err.message || "Internal error" }, { status: 500 });
  }
}