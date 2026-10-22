import mongoose, { Schema, Document, Model } from "mongoose";

export interface IAIClientProfile extends Document {
  clientId: mongoose.Types.ObjectId;
  projectId: mongoose.Types.ObjectId;
  researchId: mongoose.Types.ObjectId;

  businessSummary?: string;
  industry?: string;

  services: string[];

  targetAudience: string[];

  positioning?: string;

  valuePropositions: string[];

  brandTone: string[];

  contentThemes: string[];

  differentiationOpportunities: string[];

  verifiedFacts: Array<{
    fact: string;
    source?: string;
    url?: string;
  }>;

  version: number;
  isCurrent: boolean;

  createdAt: Date;
  updatedAt: Date;
}

const AIClientProfileSchema = new Schema<IAIClientProfile>(
  {
    clientId: {
      type: Schema.Types.ObjectId,
      ref: "Client",
      required: true,
      index: true,
    },
    projectId: {
      type: Schema.Types.ObjectId,
      ref: "AIProject",
      required: true,
      index: true,
    },

    researchId: {
      type: Schema.Types.ObjectId,
      ref: "AIResearch",
      required: true,
    },

    isCurrent: {
      type: Boolean,
      default: true,
      index: true,
    },

    businessSummary: String,

    industry: String,

    services: {
      type: [String],
      default: [],
    },

    targetAudience: {
      type: [String],
      default: [],
    },

    positioning: String,

    valuePropositions: {
      type: [String],
      default: [],
    },

    brandTone: {
      type: [String],
      default: [],
    },

    contentThemes: {
      type: [String],
      default: [],
    },

    differentiationOpportunities: {
      type: [String],
      default: [],
    },

    verifiedFacts: {
      type: [
        {
          fact: {
            type: String,
            required: true,
          },
          source: String,
          url: String,
        },
      ],
      default: [],
    },

    version: {
      type: Number,
      default: 1,
    },
  },
  {
    timestamps: true,
  }
);

export const AIClientProfile: Model<IAIClientProfile> =
  mongoose.models.AIClientProfile ||
  mongoose.model<IAIClientProfile>(
    "AIClientProfile",
    AIClientProfileSchema
  );