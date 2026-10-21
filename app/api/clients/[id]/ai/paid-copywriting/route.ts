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
  generatePaidCopy,
  AdPlatform,
  PaidMediaType,
} from "@/lib/ai/writer/generate-paid-copy";

import { resolveTextLLM } from "@/lib/ai/llm/resolve";
import { llmErrorResponse } from "@/lib/ai/llm/http";

type Ctx = { params: Promise<{ id: string }> };

export const maxDuration = 120;

// POST /api/clients/[id]/ai/paid-copywriting
// Body: { adPlatform, mediaType, selectedContext, customPrompt }
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
      adPlatform,
      mediaType,
      selectedContext,
      customPrompt,
      mode = "generate",
      existing,
      instruction,
    }: {
      adPlatform: AdPlatform;
      mediaType: PaidMediaType;
      selectedContext: CopywritingContextKey[];
      customPrompt: string;
      mode?: "generate" | "refine";
      existing?: {
        adCopy?: string;
        headlines?: string[];
        primaryTexts?: string[];
        longHeadline?: string;
        descriptions?: string[];
      };
      instruction?: string;
    } = body;

    const isRefine = mode === "refine";

    if (!adPlatform || !mediaType) {
      return NextResponse.json(
        { error: "adPlatform and mediaType are required" },
        { status: 400 }
      );
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

    // Paid copywriting reads from Phase 1 research — it does not trigger it.
    // Primary source is the project's persisted context (contextStatus "ready");
    // fall back to the latest completed research's finalAnalysis (same shape),
    // mirroring the social copywriting route.
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

    const result = await generatePaidCopy({
      llm,
      clientName: client.brandName || client.name,
      adPlatform,
      mediaType,
      customPrompt: (customPrompt ?? "").trim(),
      context,
      mode,
      existing,
      instruction: instruction?.trim(),
    });

    await AIUsage.create({
      userId: session.userId,
      clientId: id,
      provider: result.provider,
      model: result.model,
      operation: isRefine ? "paid_copywriting_refine" : "paid_copywriting",
      inputTokens: result.inputTokens,
      outputTokens: result.outputTokens,
      webSearchCount: 0,
      estimatedCost: 0,
    });

    return NextResponse.json({
      adCopy: result.adCopy,
      headlines: result.headlines,
      primaryTexts: result.primaryTexts,
      longHeadline: result.longHeadline,
      descriptions: result.descriptions,
    });
  } catch (err: any) {
    const llmResponse = llmErrorResponse(err, "ai paid copywriting POST");
    if (llmResponse) return llmResponse;
    return NextResponse.json({ error: err.message || "Internal error" }, { status: 500 });
  }
}
