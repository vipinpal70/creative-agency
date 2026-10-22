export type CopywritingContextKey =
  | "businessAnalysis"
  | "competitors"
  | "sources"
  | "differentiationOpportunities"
  | "verifiedFacts";

export interface SelectedCopyContext {
  businessSummary?: string;
  industry?: string;
  positioning?: string;
  valuePropositions?: string[];
  brandTone?: string[];
  competitors?: Array<{ name: string; differentiation?: string }>;
  sources?: Array<{ title: string; url: string }>;
  differentiationOpportunities?: string[];
  verifiedFacts?: Array<{ fact: string; source?: string }>;
}

/*
 * Pulls ONLY the pieces of AIProject.context the writer actually checked
 * in the UI. Nothing unchecked is sent to the model — same
 * token-optimization principle as the rest of the AI layer, applied
 * per-request based on the writer's own selection instead of a fixed
 * per-task default.
 */
export function selectCopyContext(
  savedProjectContext: any,
  selectedKeys: CopywritingContextKey[]
): SelectedCopyContext {
  const selected: SelectedCopyContext = {};

  if (selectedKeys.includes("businessAnalysis") && savedProjectContext?.businessAnalysis) {
    const ba = savedProjectContext.businessAnalysis;
    selected.businessSummary = ba.businessSummary;
    selected.industry = ba.industry;
    selected.positioning = ba.positioning;
    selected.valuePropositions = ba.valuePropositions;
    selected.brandTone = ba.brandTone;
  }

  if (selectedKeys.includes("competitors") && Array.isArray(savedProjectContext?.competitors)) {
    selected.competitors = savedProjectContext.competitors.map((c: any) => ({
      name: c.name,
      differentiation: c.differentiation,
    }));
  }

  if (selectedKeys.includes("sources") && Array.isArray(savedProjectContext?.sources)) {
    selected.sources = savedProjectContext.sources;
  }

  if (
    selectedKeys.includes("differentiationOpportunities") &&
    Array.isArray(savedProjectContext?.differentiationOpportunities)
  ) {
    selected.differentiationOpportunities = savedProjectContext.differentiationOpportunities;
  }

  if (selectedKeys.includes("verifiedFacts") && Array.isArray(savedProjectContext?.verifiedFacts)) {
    selected.verifiedFacts = savedProjectContext.verifiedFacts;
  }

  return selected;
}