import Anthropic from "@anthropic-ai/sdk";
import { AI_TASKS } from "./task-registry";
import { AITaskClassification, AITaskType } from "./type";

const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
});

/*
 * Classification is a cheap, high-volume call — use the fast/small model,
 * not the same model you use for the actual research generation.
 */
const ROUTER_MODEL = process.env.AI_ROUTER_MODEL || "claude-haiku-4-5-20251001";

const CLASSIFY_TOOL: Anthropic.Tool = {
  name: "classify_request",
  description:
    "Classify a user's free-form request into exactly one CreativeOS AI task type.",
  input_schema: {
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
  userPrompt: string,
  recentMessagesSummary?: string
): Promise<AITaskClassification> {
  const response = await anthropic.messages.create({
    model: ROUTER_MODEL,
    max_tokens: 300,
    system: buildRouterSystemPrompt(),
    tools: [CLASSIFY_TOOL],
    tool_choice: { type: "tool", name: "classify_request" },
    messages: [
      {
        role: "user",
        content: recentMessagesSummary
          ? `Recent conversation context:\n${recentMessagesSummary}\n\nNew request: ${userPrompt}`
          : userPrompt,
      },
    ],
  });

  const toolUse = response.content.find(
    (block): block is Anthropic.ToolUseBlock => block.type === "tool_use"
  );

  // Defensive fallback: if the classifier ever fails to call the tool,
  // default to general_chat rather than failing the whole request.
  if (!toolUse) {
    return { task: "general_chat", reasoning: "fallback: no tool call", parameters: {} };
  }

  const input = toolUse.input as {
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