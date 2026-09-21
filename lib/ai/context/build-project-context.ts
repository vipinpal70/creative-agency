import { ProjectContext, AITaskType } from "@/lib/ai/type";
import { getOrCreateAIProject } from "@/lib/ai/project/get-or-create-project";
import { runAndSaveClientResearch } from "@/lib/ai/research/run-save-client-research";

interface BuildContextArgs {
  clientId: string;
  userId: string;
  task: AITaskType;
}

interface BuildContextResult {
  context: ProjectContext;
  /** true only on the very first call for this project. */
  bootstrapped: boolean;
  /** the full client_research result, only present when bootstrapped is true. */
  bootstrapResult?: unknown;
}

/*
 * The bridge between the fixed onboarding research and free-form chat:
 *
 *  - First time a client is used with the LLM (project.contextStatus is
 *    still "pending"): run the FULL predefined client_research prompt,
 *    save it onto AIProject.context, and use it immediately.
 *  - Every call after that: read the already-saved AIProject.context —
 *    no re-research, no extra tokens, just reuse.
 */
export async function buildProjectContext({
  clientId,
  userId,
  task,
}: BuildContextArgs): Promise<BuildContextResult> {
  const { client, project } = await getOrCreateAIProject(clientId, userId);

  let bootstrapped = false;
  let bootstrapResult: unknown;
  let saved = project.context as any;

  if (project.contextStatus !== "ready") {
    const { result } = await runAndSaveClientResearch({
      client,
      project,
      userId,
    });

    bootstrapped = true;
    bootstrapResult = result;
    saved = result;
  }

  const context: ProjectContext = {
    clientId,
    clientName: client.brandName || client.name,
    industry: saved?.businessAnalysis?.industry,
    website: client.website,
    businessSummary: saved?.businessAnalysis?.businessSummary,
    approvedCompetitors: (saved?.competitors ?? []).map((c: any) => ({
      name: c.name,
      website: c.website,
    })),
  };

  return { context, bootstrapped, bootstrapResult };
}