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

  sources: Array<{
    title?: string;
    url: string;
  }>;
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

  sources: Array<{
    title?: string;
    url: string;
  }>;
}