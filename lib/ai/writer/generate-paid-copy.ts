import type { ResolvedTextLLM } from "@/lib/ai/llm/resolve";
import type { LLMProviderId } from "@/lib/ai/llm/catalog";
import { SelectedCopyContext } from "@/lib/ai/context/context-selector";


// Paid-media platform — mirrors AdPlatform in components/writer/types.ts.
export type AdPlatform = "meta" | "google";

// Paid-media creative format — mirrors VARIANT_MEDIA_TYPES in VariantModal.tsx.
export type PaidMediaType = "Static" | "Carousel" | "Video";

// How many variations to produce for the multi-value fields (the UI accepts
// up to 5). Three gives the writer options without overwhelming the modal.
const VARIATION_COUNT = 3;

const MEDIA_GUIDANCE: Record<PaidMediaType, string> = {
  Static:
    "This is a single static image ad — each piece of copy must stand alone without relying on motion or multiple frames.",
  Carousel:
    "This is a carousel ad — keep the copy punchy and benefit-led so each headline/primary text works alongside swipeable creative.",
  Video:
    "This is a video ad — write copy that complements a moving creative, with a strong hook and a clear payoff.",
};

export interface GeneratePaidCopyArgs {
  // The workspace's resolved text-generation provider/model (see lib/ai/llm/resolve).
  llm: ResolvedTextLLM;
  clientName: string;
  adPlatform: AdPlatform;
  mediaType: PaidMediaType;
  customPrompt: string;
  context: SelectedCopyContext;
  // "refine" iterates on existing ad copy instead of writing from scratch:
  // `existing` is the current copy the writer sees and `instruction` is their
  // feedback. The model edits `existing` and returns the same JSON shape.
  mode?: "generate" | "refine";
  existing?: {
    adCopy?: string;
    headlines?: string[];
    primaryTexts?: string[];
    longHeadline?: string;
    descriptions?: string[];
  };
  instruction?: string;
}

export interface PaidCopyResult {
  // Shared across both platforms — the standalone "Copy" field.
  adCopy: string;
  // Meta + Google — one or more short headlines.
  headlines: string[];
  // Meta only — one or more primary text blocks.
  primaryTexts: string[];
  // Google only — a single longer headline.
  longHeadline: string;
  // Google only — one or more descriptions.
  descriptions: string[];
  inputTokens: number;
  outputTokens: number;
  provider: LLMProviderId;
  model: string;
}

// Meta returns copy + primary text + headline variations.
function metaSchema(): string {
  const arr = () =>
    Array.from({ length: VARIATION_COUNT }, () => `""`).join(", ");
  return `{
  "adCopy": "",
  "primaryTexts": [${arr()}],
  "headlines": [${arr()}]
}`;
}

// Google returns copy + headline + long headline + description.
function googleSchema(): string {
  const arr = () =>
    Array.from({ length: VARIATION_COUNT }, () => `""`).join(", ");
  return `{
  "adCopy": "",
  "headlines": [${arr()}],
  "longHeadline": "",
  "descriptions": [${arr()}]
}`;
}

function toStringArray(value: any): string[] {
  return Array.isArray(value)
    ? value.map((v) => (typeof v === "string" ? v : "")).filter(Boolean)
    : [];
}

function parseResult(text: string, adPlatform: AdPlatform): Omit<
  PaidCopyResult,
  "inputTokens" | "outputTokens" | "provider" | "model"
> {
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
      throw new Error("AI paid copywriting response was not valid JSON.");
    }

    parsed = JSON.parse(cleaned.slice(start, end + 1));
  }

  return {
    adCopy: typeof parsed?.adCopy === "string" ? parsed.adCopy : "",
    headlines: toStringArray(parsed?.headlines),
    primaryTexts:
      adPlatform === "meta" ? toStringArray(parsed?.primaryTexts) : [],
    longHeadline:
      adPlatform === "google" && typeof parsed?.longHeadline === "string"
        ? parsed.longHeadline
        : "",
    descriptions:
      adPlatform === "google" ? toStringArray(parsed?.descriptions) : [],
  };
}

/*
 * Reusable, UI-agnostic paid-media copywriting service — the paid-media
 * counterpart of generateSocialCopy. Takes the platform, media type, the
 * chosen research-context slices and the writer's own instructions, and
 * returns ONLY the mandatory ad fields for that platform:
 *   - Meta:   copy, primary text, headline
 *   - Google: copy, headline, long headline, description
 *
 * Like generateSocialCopy, this does NOT go through the router/task-registry —
 * intent is already specified explicitly via the UI.
 */
export async function generatePaidCopy({
  clientName,
  adPlatform,
  mediaType,
  customPrompt,
  context,
  mode = "generate",
  existing,
  instruction,
  llm,
}: GeneratePaidCopyArgs): Promise<PaidCopyResult> {
  const isGoogle = adPlatform === "google";
  const isRefine = mode === "refine";
  const outputSchema = isGoogle ? googleSchema() : metaSchema();

  const platformGuidance = isGoogle
    ? `Write Google Ads responsive search/display copy. Provide:
- "adCopy": the core ad message / offer in one sentence.
- "headlines": ${VARIATION_COUNT} short headlines, each 30 characters or fewer.
- "longHeadline": one longer headline, 90 characters or fewer.
- "descriptions": ${VARIATION_COUNT} descriptions, each 90 characters or fewer.`
    : `Write Meta (Facebook/Instagram) ad copy. Provide:
- "adCopy": the core ad message / offer in one sentence.
- "primaryTexts": ${VARIATION_COUNT} primary-text variations — the main body copy above the creative.
- "headlines": ${VARIATION_COUNT} short headlines, each 40 characters or fewer.`;

  const systemPrompt = `You are the CreativeOS AI copywriter producing paid-media ad copy for ${clientName}.

${MEDIA_GUIDANCE[mediaType]}

${platformGuidance}

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
      ? `\nYou are REVISING existing ad copy, not writing from scratch. Apply only the requested change and keep everything else as close to the current version as possible.\n`
      : ""
  }
Return ONLY valid JSON matching exactly this structure — no markdown, no commentary, no extra fields:

${outputSchema}`;

  // Refine sends the current ad copy plus the writer's feedback; generate sends
  // the original instructions. Either way the model returns the full JSON shape.
  const existingForPlatform = isGoogle
    ? {
        adCopy: existing?.adCopy ?? "",
        headlines: existing?.headlines ?? [],
        longHeadline: existing?.longHeadline ?? "",
        descriptions: existing?.descriptions ?? [],
      }
    : {
        adCopy: existing?.adCopy ?? "",
        primaryTexts: existing?.primaryTexts ?? [],
        headlines: existing?.headlines ?? [],
      };

  const userMessage = isRefine
    ? `Here is the current ad copy as JSON:

${JSON.stringify(existingForPlatform, null, 2)}

Apply this change: ${instruction?.trim() || customPrompt}

Return the full updated ad copy in the same JSON structure.`
    : customPrompt;

  const response = await llm.generateText({
    maxTokens: 2000,
    system: systemPrompt,
    messages: [{ role: "user", content: userMessage }],
  });

  const parsed = parseResult(response.text, adPlatform);

  return {
    ...parsed,
    inputTokens: response.inputTokens,
    outputTokens: response.outputTokens,
    provider: response.provider,
    model: response.model,
  };
}
