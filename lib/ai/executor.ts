import Anthropic from "@anthropic-ai/sdk";
import { AI_TASKS } from "./task-registry";
import { AIExecutionResult, AITaskType, ProjectContext } from "./type";

const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
});

const EXECUTION_MODEL = process.env.AI_ANTHROPIC_MODEL || "claude-sonnet-5";

function extractText(response: Anthropic.Message): string {
  return response.content
    .filter((block): block is Anthropic.TextBlock => block.type === "text")
    .map((block) => block.text)
    .join("\n");
}

/*
 * Defensive cleanup: strips markdown fences AND any inline <cite ...> tags
 * that occasionally leak into raw text output — citations should only ever
 * arrive via the schema's own "sources" field, never as inline markup.
 */
function cleanText(text: string): string {
  return text
    .trim()
    .replace(/^```json\s*/i, "")
    .replace(/^```\s*/i, "")
    .replace(/\s*```$/i, "")
    .replace(/<\/?cite[^>]*>/gi, "");
}

function extractJson(text: string, schemaHint: string): unknown {
  const cleaned = cleanText(text);

  try {
    return JSON.parse(cleaned);
  } catch {
    const start = cleaned.indexOf("{");
    const end = cleaned.lastIndexOf("}");

    if (start !== -1 && end > start) {
      // Let this throw if it's still invalid — caller decides how to
      // handle/retry, same pattern as the original client-research flow.
      return JSON.parse(cleaned.slice(start, end + 1));
    }

    throw new Error(`Model did not return valid JSON for schema: ${schemaHint}`);
  }
}

/*
 * Runs exactly one already-classified task. The system prompt and output
 * contract come entirely from that task's own config — nothing here is
 * shared or forced across tasks the way the old fixed schema was.
 */
export async function executeTask(
  task: AITaskType,
  userPrompt: string,
  context: ProjectContext
): Promise<AIExecutionResult> {
  const config = AI_TASKS[task];

  const systemPrompt =
    config.outputMode === "json"
      ? `${config.buildSystemPrompt(context)}

Return ONLY valid JSON matching exactly this structure — no markdown, no commentary, no extra fields, no inline citation tags:

${config.outputSchema}`
      : config.buildSystemPrompt(context);

  const response = await anthropic.messages.create({
    model: EXECUTION_MODEL,
    max_tokens: 4000,
    system: systemPrompt,
    messages: [{ role: "user", content: userPrompt }],
    ...(config.needsWebSearch
      ? { tools: [{ type: "web_search_20250305", name: "web_search", max_uses: 8 }] }
      : {}),
  });

  const inputTokens = response.usage?.input_tokens ?? 0;
  const outputTokens = response.usage?.output_tokens ?? 0;
  const webSearchCount = response.usage?.server_tool_use?.web_search_requests ?? 0;

  const text = extractText(response);

  if (config.outputMode === "text") {
    return {
      taskType: task,
      outputMode: "text",
      text: cleanText(text),
      inputTokens,
      outputTokens,
      webSearchCount,
    };
  }

  // JSON-mode tasks aren't guaranteed to come back as clean JSON — once web
  // search is in play the model often answers in prose (e.g. "no public profit
  // figures exist, but revenue is estimated at…"). Rather than 500 the whole
  // request, degrade gracefully to a text answer the user can still read. The
  // frontend renders any dataless response as a plain chat message.
  try {
    const data = extractJson(text, config.outputSchema ?? "");

    return {
      taskType: task,
      outputMode: "json",
      data,
      inputTokens,
      outputTokens,
      webSearchCount,
    };
  } catch {
    return {
      taskType: task,
      outputMode: "text",
      text: cleanText(text),
      inputTokens,
      outputTokens,
      webSearchCount,
    };
  }
}