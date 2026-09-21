import mongoose, { Schema, Document, Model } from "mongoose";

export interface IAIProject extends Document {
  clientId: mongoose.Types.ObjectId;
  name: string;
  slug: string;
  status: "active" | "archived";
  createdBy: mongoose.Types.ObjectId;
  lastActivityAt?: Date;
  context: any; // store the JSON context
  contextStatus: "pending" | "ready"; // pending -> run generation, ready -> use for chat
  contextGeneratedAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

const AIProjectSchema = new Schema<IAIProject>(
  {
    clientId: {
      type: Schema.Types.ObjectId,
      ref: "Client",
      required: true,
      // index: true,
    },

    name: {
      type: String,
      required: true,
      trim: true,
    },

    slug: {
      type: String,
      required: true,
      trim: true,
    },
    context: {
      type: Schema.Types.Mixed,
      default: null,
    },
    contextStatus: {
      type: String,
      enum: ["pending", "ready"],
      default: "pending",
    },
    contextGeneratedAt: {
      type: Date,
      default: null,
    },

    status: {
      type: String,
      enum: ["active", "archived"],
      default: "active",
      index: true,
    },

    createdBy: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },

    lastActivityAt: {
      type: Date,
    },
  },
  {
    timestamps: true,
  }
);

AIProjectSchema.index(
  { clientId: 1 },
  { unique: true }
);

const AIProject =
  mongoose.models.AIProject ||
  mongoose.model<IAIProject>("AIProject", AIProjectSchema);

export default AIProject;