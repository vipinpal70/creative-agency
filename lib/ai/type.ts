/*
 * Shared types for the CreativeOS AI free-prompt architecture.
 *
 * Key idea: outputMode is a property of the TASK, decided by the router
 * BEFORE generation happens — never a single fixed schema applied to
 * every request.
 */

export type AITaskType =
  | "general_chat"
  | "business_analysis"
  | "competitor_research"
  | "competitor_analysis"
  | "financial_analysis"
  | "social_research"
  | "market_research"
  | "copywriting"
  | "client_research"; // the original full onboarding audit, kept as-is

export type AIOutputMode = "text" | "json";

/*
 * Only the fields relevant to CURRENT task get populated by the context
 * builder — this is the "token optimization" layer. Everything is
 * optional on purpose.
 */
export interface ProjectContext {
  clientId: string;
  clientName: string;
  industry?: string;
  website?: string;
  businessSummary?: string;
  approvedCompetitors?: Array<{ name: string; website?: string }>;
  recentMessagesSummary?: string;
}

export interface AITaskClassification {
  task: AITaskType;
  reasoning: string;
  parameters: Record<string, unknown>;
}

export interface AIExecutionResult {
  taskType: AITaskType;
  outputMode: AIOutputMode;
  text?: string; // present when outputMode === "text"
  data?: unknown; // present when outputMode === "json" — shape depends on task
  inputTokens: number;
  outputTokens: number;
  webSearchCount: number;
}

/*
 * ── Per-task JSON data shapes ─────────────────────────────────────────────
 * One interface per json-mode task, mirroring the outputSchema strings in
 * task-registry.ts. The frontend narrows `AIExecutionResult.data` to one of
 * these by switching on `taskType`.
 */

export interface Source {
  title?: string;
  url: string;
}

export interface BusinessAnalysisData {
  businessSummary: string;
  industry: string;
  positioning: string;
  services?: string[];
  targetAudience?: string[];
  valuePropositions: string[];
  brandTone: string[];
  contentThemes: string[];
}

export interface CompetitorResearchData {
  competitors: Array<{
    name: string;
    website?: string;
    services?: string[];
    sources?: Source[];
  }>;
}

export interface CompetitorAnalysisData {
  competitors: Array<{
    name: string;
    strengths?: string[];
    weaknesses?: string[];
    differentiation?: string;
    sources?: Source[];
  }>;
}

export interface FinancialAnalysisData {
  subject: string;
  pricingModel: string;
  notableFindings: string[];
  sources?: Source[];
}

export interface SocialResearchData {
  subject: string;
  platforms: Array<{ platform: string; url?: string; notes?: string }>;
}

export interface MarketResearchData {
  marketOverview: string;
  trends: string[];
  opportunities: string[];
  sources?: Source[];
}

/*
 * The exact JSON body returned by POST /api/ai/chat. The frontend switches on
 * `taskType`/`outputMode` to decide which view renders.
 */
export interface ChatApiResponse {
  success: boolean;
  taskType?: AITaskType;
  outputMode?: AIOutputMode;
  text?: string;
  data?: unknown;
  conversationId?: string;
  message?: string;
}














/*
 * ── Legacy fixed client-research shapes ───────────────────────────────────
 * Still used by the original onboarding-audit flow (client-research.ts) and
 * the full "client_research" panel. Kept as-is: this is the one task whose
 * output stays the rich, everything-at-once report.
 */

import { ISocialPresence } from "@/lib/models/client.model";

export interface AIClientContext {
  clientId: string;

  business: {
    name?: string;
    brandName?: string;
    industry?: string;
    website?: string;
    location?: string;
    aboutBrand?: string;
    requirementNotes?: string;
  };

  socialMediaPresence: ISocialPresence[];
}

export interface AICompetitorResult {
  name: string;
  website?: string;
  location?: string;
  industry?: string;

  services: string[];
  targetAudience: string[];

  positioning?: string;

  valuePropositions: string[];

  contentThemes: string[];

  socialPlatforms: string[];

  strengths: string[];
  weaknesses: string[];

  differentiation?: string;

  sources: Source[];
}

export interface AIResearchResult {
  businessAnalysis: {
    businessSummary: string;
    industry: string;
    services: string[];
    targetAudience: string[];
    positioning: string;
    valuePropositions: string[];
    brandTone: string[];
    contentThemes: string[];
  };

  competitors: AICompetitorResult[];

  differentiationOpportunities: string[];

  verifiedFacts: Array<{
    fact: string;
    source?: string;
    url?: string;
  }>;

  sources: Source[];
}