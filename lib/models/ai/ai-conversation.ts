import mongoose, { Schema, Document, Model } from "mongoose";

export interface IAIConversation extends Document {
  projectId: mongoose.Types.ObjectId;
  title: string;

  type:
    | "general"
    | "client_research"
    | "copywriting"
    | "image_generation"
    | "chat";

  createdBy: mongoose.Types.ObjectId;

  lastMessageAt?: Date;

  createdAt: Date;
  updatedAt: Date;
}

const AIConversationSchema = new Schema<IAIConversation>(
  {
    projectId: {
      type: Schema.Types.ObjectId,
      ref: "AIProject",
      required: true,
      index: true,
    },

    title: {
      type: String,
      required: true,
      trim: true,
      maxlength: 200,
    },

    type: {
      type: String,
      enum: [
        "general",
        "client_research",
        "copywriting",
        "image_generation",
        "chat",
      ],
      default: "general",
      index: true,
    },

    createdBy: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },

    lastMessageAt: {
      type: Date,
      index: true,
    },
  },
  {
    timestamps: true,
  }
);

/*
 * Useful for loading conversations for a project
 * ordered by most recent activity.
 */
AIConversationSchema.index({
  projectId: 1,
  lastMessageAt: -1,
});

const AIConversation: Model<IAIConversation> =
  mongoose.models.AIConversation ||
  mongoose.model<IAIConversation>(
    "AIConversation",
    AIConversationSchema
  );

export default AIConversation;