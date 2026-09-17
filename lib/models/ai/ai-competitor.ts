import mongoose, { Schema, Document, Model } from "mongoose";

export interface IAICompetitor extends Document {
  clientId: mongoose.Types.ObjectId;
  researchId: mongoose.Types.ObjectId;
  projectId: mongoose.Types.ObjectId;

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
    url?: string;
  }>;

  verified: boolean;
  verifiedBy?: mongoose.Types.ObjectId;
  verifiedAt?: Date;

  createdAt: Date;
  updatedAt: Date;
}

const AICompetitorSchema = new Schema<IAICompetitor>(
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
      index: true,
    },

    name: {
      type: String,
      required: true,
      trim: true,
    },

    website: String,

    location: String,

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

    contentThemes: {
      type: [String],
      default: [],
    },

    socialPlatforms: {
      type: [String],
      default: [],
    },

    strengths: {
      type: [String],
      default: [],
    },

    weaknesses: {
      type: [String],
      default: [],
    },

    differentiation: String,

    sources: {
      type: [
        {
          title: String,
          url: String,
        },
      ],
      default: [],
    },

    verified: {
      type: Boolean,
      default: false,
    },

    verifiedBy: {
      type: Schema.Types.ObjectId,
      ref: "User",
    },

    verifiedAt: Date,
  },
  {
    timestamps: true,
  }
);

export const AICompetitor: Model<IAICompetitor> =
  mongoose.models.AICompetitor ||
  mongoose.model<IAICompetitor>("AICompetitor", AICompetitorSchema);