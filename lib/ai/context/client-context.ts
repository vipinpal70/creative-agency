import { IClient, ICompetitor } from "@/lib/models/client.model";
import { AIClientContext } from "../type";

export type ClientAIInput = Partial<IClient> & {
  _id: { toString(): string };
  location?: string;
};

export function buildClientAIContext(client: ClientAIInput): AIClientContext {
  return {
    clientId: client._id.toString(),

    business: {
      name: client.name,
      brandName: client.brandName,
      industry: client.industry,
      website: client.website,
      location: client.location,
      aboutBrand: client.aboutBrand,
      requirementNotes: client.requirementNotes,
    },

    // competitors: Array.isArray(client.competitors)
    //   ? client.competitors
    //   : [],

    socialMediaPresence:
      client.socialMediaPresence ?? [],

}}