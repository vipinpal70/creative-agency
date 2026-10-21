import type { ResolvedTextLLM } from "@/lib/ai/llm/resolve";
import type { LLMProviderId } from "@/lib/ai/llm/catalog";
import { SelectedCopyContext } from "@/lib/ai/context/context-selector";


export type ContentCategory = "reel" | "static_image" | "carousel" | "article";

const CATEGORY_GUIDANCE: Record<ContentCategory, string> = {
  reel:
    "Write for a short-form vertical video script: a strong hook in the first line, a brief beat structure, and a clear call to action.",
  static_image:
    "Write for a single static image post: a concise, scroll-stopping caption that stands alone without a carousel or video.",
  carousel:
    "Write for a multi-slide carousel: one distinct slide of copy per frame — frame 1 is the hook, the middle frames deliver value one idea at a time, the final frame is the call to action. Keep each frame punchy and self-contained.",
  article:
    "Write a long-form article / blog post: a compelling title-worthy opening, well-structured body paragraphs with clear flow, and a closing that drives the reader to act. Put the full article body in the \"copy\" field.",
};

export interface CarouselFrame {
  frameNo: number;
  copy: string;
}

export interface GenerateSocialCopyArgs {
  // The workspace's resolved text-generation provider/model (see lib/ai/llm/resolve).
  llm: ResolvedTextLLM;
  clientName: string;
  category: ContentCategory;
  customPrompt: string;
  context: SelectedCopyContext;
  // Number of slides to produce — only used when category === "carousel".
  frameCount?: number;
  // "refine" iterates on existing content instead of writing from scratch:
  // `existing` is the current copy the writer is looking at and `instruction`
  // is their feedback. The model edits `existing` per the instruction and
  // returns the same JSON shape, so nothing outside the change is lost.
  mode?: "generate" | "refine";
  existing?: {
    copy?: string;
    caption?: string;
    hashtags?: string[];
    frames?: CarouselFrame[];
  };
  instruction?: string;
}

export interface SocialCopyResult {
  copy: string;
  caption: string;
  hashtags: string[];
  // Populated only for carousel — one entry per slide, in order.
  frames: CarouselFrame[];
  inputTokens: number;
  outputTokens: number;
  provider: LLMProviderId;
  model: string;
}

const OUTPUT_SCHEMA = `{
  "copy": "",
  "caption": "",
  "hashtags": []
}`;

// Carousel returns one copy block per slide instead of a single flat "copy".
function carouselSchema(frameCount: number): string {
  const frames = Array.from(
    { length: frameCount },
    (_, i) => `    { "frameNo": ${i + 1}, "copy": "" }`
  ).join(",\n");
  return `{
  "frames": [
${frames}
  ],
  "caption": "",
  "hashtags": []
}`;
}

function parseResult(
  text: string
): { copy: string; caption: string; hashtags: string[]; frames: CarouselFrame[] } {
  const cleaned = text
    .trim()
    .replace(/^```json\s*/i, "")
    .replace(/^```\s*/i, "")
    .replace(/\s*```$/i, "");

  let parsed: any;

  try {
    parsed = JSON.parse(cleaned);
  } catch {
    const start = cleaned.indexOf("{");
    const end = cleaned.lastIndexOf("}");

    if (start === -1 || end <= start) {
      throw new Error("AI copywriting response was not valid JSON.");
    }

    parsed = JSON.parse(cleaned.slice(start, end + 1));
  }

  const frames: CarouselFrame[] = Array.isArray(parsed?.frames)
    ? parsed.frames
        .map((f: any, i: number) => ({
          frameNo: typeof f?.frameNo === "number" ? f.frameNo : i + 1,
          copy: typeof f?.copy === "string" ? f.copy : "",
        }))
        .sort((a: CarouselFrame, b: CarouselFrame) => a.frameNo - b.frameNo)
    : [];

  return {
    copy: parsed?.copy || "",
    caption: parsed?.caption || "",
    hashtags: Array.isArray(parsed?.hashtags) ? parsed.hashtags : [],
    frames,
  };
}

/*
 * Reusable, UI-agnostic copywriting service. Takes exactly what the
 * writer selected — category, chosen context slices, and their own
 * instructions — and returns ONLY copy/caption/hashtags. No business
 * analysis, no competitor fields, nothing outside what was asked for.
 *
 * This does NOT go through the router/task-registry from the free-chat
 * architecture — the writer already specified intent explicitly via the
 * UI, so there's nothing to classify.
 */
export async function generateSocialCopy({
  clientName,
  category,
  customPrompt,
  context,
  frameCount,
  mode = "generate",
  existing,
  instruction,
  llm,
}: GenerateSocialCopyArgs): Promise<SocialCopyResult> {
  const isRefine = mode === "refine";
  // Carousel produces exactly `frames` slides and uses a per-slide schema;
  // everything else returns the flat copy/caption/hashtags shape.
  const isCarousel = category === "carousel";
  const resolvedFrameCount =
    isCarousel && Number.isFinite(frameCount) ? Math.max(2, Math.min(10, Math.floor(frameCount!))) : 0;

  const outputSchema = isCarousel
    ? carouselSchema(resolvedFrameCount || 3)
    : OUTPUT_SCHEMA;

  const systemPrompt = `You are the CreativeOS AI copywriter working on content for ${clientName}.

${CATEGORY_GUIDANCE[category]}${
    isCarousel
      ? `\n\nProduce exactly ${resolvedFrameCount || 3} slides — no more, no fewer. Each slide's text goes in its own "copy" field in the "frames" array, in order.`
      : ""
  }

Use only the context provided below — do not invent facts about the client or competitors.
${context.businessSummary ? `Business summary: ${context.businessSummary}` : ""}
${context.industry ? `Industry: ${context.industry}` : ""}
${context.positioning ? `Positioning: ${context.positioning}` : ""}
${context.brandTone?.length ? `Brand tone: ${context.brandTone.join(", ")}` : ""}
${context.valuePropositions?.length ? `Value propositions: ${context.valuePropositions.join(", ")}` : ""}
${
  context.competitors?.length
    ? `Competitor differentiation to lean into: ${context.competitors
        .map((c) => `${c.name} (${c.differentiation || "n/a"})`)
        .join("; ")}`
    : ""
}
${
  context.differentiationOpportunities?.length
    ? `Differentiation opportunities: ${context.differentiationOpportunities.join(", ")}`
    : ""
}

${
    isRefine
      ? `\nYou are REVISING existing content, not writing from scratch. Apply only the requested change and keep everything else as close to the current version as possible.\n`
      : ""
  }
Return ONLY valid JSON matching exactly this structure — no markdown, no commentary, no extra fields:

${outputSchema}`;

  // Refine sends the current content plus the writer's feedback; generate sends
  // the original instructions. Either way the model returns the full JSON shape.
  const userMessage = isRefine
    ? `Here is the current content as JSON:

${JSON.stringify(
  isCarousel
    ? { frames: existing?.frames ?? [], caption: existing?.caption ?? "", hashtags: existing?.hashtags ?? [] }
    : { copy: existing?.copy ?? "", caption: existing?.caption ?? "", hashtags: existing?.hashtags ?? [] },
  null,
  2
)}

Apply this change: ${instruction?.trim() || customPrompt}

Return the full updated content in the same JSON structure.`
    : customPrompt;

  const response = await llm.generateText({
    // Articles are long-form; the short formats comfortably fit in 2000.
    maxTokens: category === "article" ? 4000 : 2000,
    system: systemPrompt,
    messages: [{ role: "user", content: userMessage }],
  });

  const parsed = parseResult(response.text);

  return {
    ...parsed,
    inputTokens: response.inputTokens,
    outputTokens: response.outputTokens,
    provider: response.provider,
    model: response.model,
  };
}