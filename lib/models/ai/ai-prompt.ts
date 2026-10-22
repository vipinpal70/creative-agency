import mongoose, { Schema, Document, Model } from "mongoose";


//Stores the premade prompt that Admin can edit/version.

export interface IAIPrompt extends Document {
  name: string;
  type: "client_research" | "copywriting" | "image_generation";
  prompt: string;
  variables: string[];
  isDefault: boolean;
  version: number;
  createdBy: mongoose.Types.ObjectId;
  updatedBy?: mongoose.Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
}

const AIPromptSchema = new Schema<IAIPrompt>(
  {
    name: {
      type: String,
      required: true,
      trim: true,
    },

    type: {
      type: String,
      enum: [
        "client_research",
        "copywriting",
        "image_generation",
      ],
      required: true,
    },

    prompt: {
      type: String,
      required: true,
    },

    variables: {
      type: [String],
      default: [],
    },

    isDefault: {
      type: Boolean,
      default: false,
    },

    version: {
      type: Number,
      default: 1,
    },

    createdBy: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },

    updatedBy: {
      type: Schema.Types.ObjectId,
      ref: "User",
    },
  },
  {
    timestamps: true,
  }
);

export const AIPrompt: Model<IAIPrompt> =
  mongoose.models.AIPrompt ||
  mongoose.model<IAIPrompt>("AIPrompt", AIPromptSchema);