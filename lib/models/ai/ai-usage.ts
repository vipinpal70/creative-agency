import mongoose, { Schema, Model } from "mongoose";

export interface IAIUsage {
  userId: mongoose.Types.ObjectId;
  clientId?: mongoose.Types.ObjectId;
  researchId?: mongoose.Types.ObjectId;

  provider: "anthropic" | "openai";

  model: string;

  operation:
    | "client_research"
    | "copy_generation"
    | "image_generation"
    | "chat";

  inputTokens?: number;
  outputTokens?: number;

  webSearchCount?: number;

  estimatedCost?: number;

  createdAt: Date;
}

const AIUsageSchema = new Schema<IAIUsage>(
  {
    userId: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },

    clientId: {
      type: Schema.Types.ObjectId,
      ref: "Client",
      index: true,
    },

    researchId: {
      type: Schema.Types.ObjectId,
      ref: "AIResearch",
      index: true,
    },

    provider: {
      type: String,
      enum: ["anthropic", "openai"],
      required: true,
    },

    model: {
      type: String,
      required: true,
    },

    operation: {
      type: String,
      enum: [
        "client_research",
        "copy_generation",
        "image_generation",
        "chat",
      ],
      required: true,
    },

    inputTokens: {
      type: Number,
      default: 0,
    },

    outputTokens: {
      type: Number,
      default: 0,
    },

    webSearchCount: {
      type: Number,
      default: 0,
    },

    estimatedCost: {
      type: Number,
      default: 0,
    },
  },
  {
    timestamps: true,
  }
);

export const AIUsage: Model<IAIUsage> =
  mongoose.models.AIUsage ||
  mongoose.model<IAIUsage>("AIUsage", AIUsageSchema);