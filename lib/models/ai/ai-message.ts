import mongoose, { Schema, Model } from "mongoose";

export interface IAIMessage {
  projectId: mongoose.Types.ObjectId;
  conversationId: mongoose.Types.ObjectId;

  role: "user" | "assistant" | "system" | "tool";

  content: string;

  provider?: "anthropic" | "openai";

  model?: string;

  inputTokens?: number;
  outputTokens?: number;

  toolName?: string;

  metadata?: Record<string, any>;

  createdAt: Date;
  updatedAt: Date;
}

const AIMessageSchema = new Schema<IAIMessage>(
  {
    projectId: {
      type: Schema.Types.ObjectId,
      ref: "AIProject",
      required: true,
      index: true,
    },

    conversationId: {
      type: Schema.Types.ObjectId,
      ref: "AIConversation",
      required: true,
      index: true,
    },

    role: {
      type: String,
      enum: ["user", "assistant", "system", "tool"],
      required: true,
    },

    content: {
      type: String,
      required: true,
    },

    provider: {
      type: String,
      enum: ["anthropic", "openai"],
    },

    model: {
      type: String,
    },

    inputTokens: {
      type: Number,
      default: 0,
    },

    outputTokens: {
      type: Number,
      default: 0,
    },

    toolName: {
      type: String,
    },

    metadata: {
      type: Schema.Types.Mixed,
      default: {},
    },
  },
  {
    timestamps: true,
  }
);

AIMessageSchema.index({
  conversationId: 1,
  createdAt: 1,
});

AIMessageSchema.index({
  projectId: 1,
  createdAt: -1,
});

const AIMessage: Model<IAIMessage> =
  mongoose.models.AIMessage ||
  mongoose.model<IAIMessage>("AIMessage", AIMessageSchema);

export default AIMessage;