import { AI_TASKS } from "./task-registry";
import { AITaskClassification, AITaskType } from "./type";
import type { ResolvedTextLLM } from "./llm/resolve";
import type { StructuredOutputSpec } from "./llm/types";

/*
 * Classification is a cheap, high-volume call — use the provider's
 * fast/small model (llm.routerModel), not the same model you use for the
 * actual research generation.
 */
const CLASSIFY_OUTPUT: StructuredOutputSpec = {
  name: "classify_request",
  description:
    "Classify a user's free-form request into exactly one CreativeOS AI task type.",
  schema: {
    type: "object",
    properties: {
      task: {
        type: "string",
        enum: Object.keys(AI_TASKS),
        description: "The single best-fit task type.",
      },
      reasoning: {
        type: "string",
        description: "One short sentence on why this task fits.",
      },
      parameters: {
        type: "object",
        description:
          "Any parameters extracted from the prompt, e.g. { competitorName, count, tone }.",
        additionalProperties: true,
      },
    },
    required: ["task", "reasoning"],
  },
};

function buildRouterSystemPrompt(): string {
  const taskDescriptions = Object.values(AI_TASKS)
    .map((t) => `- ${t.type}: ${t.routerDescription}`)
    .join("\n");

  return `You route a user's free-form request to exactly one CreativeOS AI task.

Available tasks:
${taskDescriptions}

Pick the single task that matches what the user actually asked for. Never pick a broader task than what was asked — a request for only competitors is "competitor_research", NOT "client_research". Only use "client_research" when the user explicitly wants the full audit.`;
}

export async function classifyRequest(
  llm: ResolvedTextLLM,
  userPrompt: string,
  recentMessagesSummary?: string
): Promise<AITaskClassification> {
  let structured: unknown;
  try {
    const response = await llm.generateText({
      modelOverride: llm.routerModel,
      maxTokens: 300,
      system: buildRouterSystemPrompt(),
      structuredOutput: CLASSIFY_OUTPUT,
      messages: [
        {
          role: "user",
          content: recentMessagesSummary
            ? `Recent conversation context:\n${recentMessagesSummary}\n\nNew request: ${userPrompt}`
            : userPrompt,
        },
      ],
    });
    structured = response.structured;
  } catch (err) {
    // Bad credentials etc. must surface, but a router-model-only failure
    // (e.g. the small model isn't enabled on this key) shouldn't block chat.
    if ((err as { code?: string })?.code !== "model_unavailable") throw err;
  }

  // Defensive fallback: if the classifier ever fails to return the object,
  // default to general_chat rather than failing the whole request.
  if (!structured || typeof structured !== "object") {
    return { task: "general_chat", reasoning: "fallback: no classification", parameters: {} };
  }

  const input = structured as {
    task: AITaskType;
    reasoning: string;
    parameters?: Record<string, unknown>;
  };

  return {
    task: AI_TASKS[input.task] ? input.task : "general_chat",
    reasoning: input.reasoning,
    parameters: input.parameters ?? {},
  };
}
