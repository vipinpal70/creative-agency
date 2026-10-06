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
  generatePaidCopy,
  AdPlatform,
  PaidMediaType,
} from "@/lib/ai/writer/generate-paid-copy";

type Ctx = { params: Promise<{ id: string }> };

// POST /api/clients/[id]/ai/paid-copywriting
// Body: { adPlatform, mediaType, selectedContext, customPrompt }
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
      adPlatform,
      mediaType,
      selectedContext,
      customPrompt,
    }: {
      adPlatform: AdPlatform;
      mediaType: PaidMediaType;
      selectedContext: CopywritingContextKey[];
      customPrompt: string;
    } = body;

    if (!adPlatform || !mediaType || !customPrompt?.trim()) {
      return NextResponse.json(
        { error: "adPlatform, mediaType and customPrompt are required" },
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

    const result = await generatePaidCopy({
      clientName: client.brandName || client.name,
      adPlatform,
      mediaType,
      customPrompt: customPrompt.trim(),
      context,
    });

    await AIUsage.create({
      userId: session.userId,
      clientId: id,
      provider: "anthropic",
      model: process.env.AI_ANTHROPIC_MODEL || "claude-sonnet-5",
      operation: "paid_copywriting",
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
    console.error("[ai paid copywriting POST]", err);
    return NextResponse.json({ error: err.message || "Internal error" }, { status: 500 });
  }
}
