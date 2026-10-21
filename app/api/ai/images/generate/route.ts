import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { forbidden, isStaff, unauthorized } from "@/lib/authz";
import mongoose from "mongoose";
import { connectDB } from "@/lib/db";
import { AIUsage } from "@/lib/models/ai/ai-usage";
import { findImageModel } from "@/lib/ai/llm/catalog";
import { resolveImageLLM } from "@/lib/ai/llm/resolve";
import { llmErrorResponse } from "@/lib/ai/llm/http";

const MAX_PROMPT_LENGTH = 4000;

export const maxDuration = 120;

// POST /api/ai/images/generate
// Body: { prompt, size?, n?, clientId? }
// Routed to the workspace image-generation configuration — never to a
// text-only provider. Returns base64 data URLs.
export async function POST(req: NextRequest) {
  const session = await getSession();
  if (!session) return unauthorized();
  // Staff only, like the other generation endpoints.
  if (!isStaff(session)) return forbidden();

  let body: { prompt?: unknown; size?: unknown; n?: unknown; clientId?: unknown };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const prompt = typeof body.prompt === "string" ? body.prompt.trim() : "";
  if (!prompt) return NextResponse.json({ error: "prompt is required" }, { status: 400 });
  if (prompt.length > MAX_PROMPT_LENGTH) {
    return NextResponse.json({ error: `prompt must be at most ${MAX_PROMPT_LENGTH} characters` }, { status: 400 });
  }

  const clientId = typeof body.clientId === "string" ? body.clientId : undefined;
  if (clientId && !mongoose.isValidObjectId(clientId)) {
    return NextResponse.json({ error: "Invalid clientId" }, { status: 400 });
  }

  try {
    const llm = await resolveImageLLM();
    const modelInfo = findImageModel(llm.provider, llm.model)!;

    const size = typeof body.size === "string" && modelInfo.sizes.includes(body.size) ? body.size : undefined;
    const n = Math.min(Math.max(Number(body.n) || 1, 1), modelInfo.maxImages);

    const result = await llm.generateImages({ prompt, size, n });

    await connectDB();
    await AIUsage.create({
      userId: session.userId,
      clientId,
      provider: result.provider,
      model: result.model,
      operation: "image_generation",
      estimatedCost: 0,
    });

    return NextResponse.json({ provider: result.provider, model: result.model, images: result.images });
  } catch (err) {
    return (
      llmErrorResponse(err, "ai images POST") ??
      NextResponse.json({ error: "Image generation failed" }, { status: 500 })
    );
  }
}
