import { AIPrompt } from "@/lib/models/ai/ai-prompt";
import { AIResearch } from "@/lib/models/ai/ai-research";
import { AIUsage } from "@/lib/models/ai/ai-usage";
import AIProject from "@/lib/models/ai/ai-project";

import { buildClientAIContext } from "@/lib/ai/context/client-context";
import { DEFAULT_CLIENT_RESEARCH_PROMPT } from "@/lib/ai/prompts/client-prompt";
import { runClientResearch } from "@/lib/ai/research/client-research";

interface RunAndSaveArgs {
  client: any;
  project: any;
  userId: string;
  promptId?: string;
  customPrompt?: string;
}

/*
 * The single place that runs the fixed client_research prompt and persists
 * it. Called from two places:
 *
 *  1. The admin "Feed to LLM" route — explicit, can re-run with a custom
 *     prompt at any time.
 *  2. The free-chat route's first-use bootstrap — automatic, always uses
 *     the default prompt, runs exactly once per project.
 *
 * Both need the exact same side effects, so this is the only place those
 * side effects are written:
 *   - an AIResearch audit record (unchanged from the original route)
 *   - an AIUsage log entry
 *   - AIProject.context — the NEW piece: this is what makes the research
 *     reusable as persistent project memory instead of a one-off report.
 */
export async function runAndSaveClientResearch({
  client,
  project,
  userId,
  promptId,
  customPrompt,
}: RunAndSaveArgs) {
  let prompt = DEFAULT_CLIENT_RESEARCH_PROMPT;
  let promptVersion = 1;

  if (promptId) {
    const savedPrompt = await AIPrompt.findById(promptId).lean();

    if (!savedPrompt) {
      throw new Error("Prompt not found");
    }

    prompt = savedPrompt.prompt;
    promptVersion = savedPrompt.version;
  }

  const adminPrompt = customPrompt?.trim() || prompt;
  const clientContext = buildClientAIContext(client);

  const research = await AIResearch.create({
    projectId: project._id,
    clientId: client._id,
    initiatedBy: userId,
    type: "client_onboarding",
    status: "researching",
    promptId: promptId || undefined,
    promptVersion,
    promptUsed: adminPrompt,
    inputSnapshot: { client: clientContext },
  });

  try {
    const aiResponse = await runClientResearch(adminPrompt, clientContext);

    await AIResearch.findByIdAndUpdate(research._id, {
      status: "completed",
      businessSearch: { queries: [], results: [] },
      competitorSearch: { queries: [], results: [] },
      businessAnalysis: aiResponse.result.businessAnalysis,
      competitorAnalysis: aiResponse.result.competitors,
      finalAnalysis: aiResponse.result,
      sources: aiResponse.result.sources || [],
    });

    await AIUsage.create({
      userId,
      clientId: client._id,
      researchId: research._id,
      provider: "anthropic",
      model: process.env.AI_ANTHROPIC_MODEL || "claude-sonnet-5",
      operation: "client_research",
      inputTokens: aiResponse.inputTokens,
      outputTokens: aiResponse.outputTokens,
      webSearchCount: aiResponse.webSearchCount,
      estimatedCost: 0,
    });

    // The piece that makes this reusable: persist the same structured
    // result onto the project itself, not just the AIResearch audit trail.
    await AIProject.findByIdAndUpdate(project._id, {
      context: aiResponse.result,
      contextStatus: "ready",
      contextGeneratedAt: new Date(),
      lastActivityAt: new Date(),
    });

    return { research, result: aiResponse.result, usage: aiResponse };
  } catch (error: any) {
    await AIResearch.findByIdAndUpdate(research._id, {
      status: "failed",
      error: error?.message || "AI research failed",
    });

    throw error;
  }
}