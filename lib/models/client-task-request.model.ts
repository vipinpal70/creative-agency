import mongoose, { Document, Model, Schema } from "mongoose";

export interface IClientTaskRequest extends Document {
  clientId: mongoose.Types.ObjectId; // Ref Client
  requestedBy: mongoose.Types.ObjectId; // Ref User
  title: string;
  description: string;
  status: "pending" | "approved" | "rejected" | "in-progress" | "completed";
  dueDate?: Date;
  createdAt: Date;
  updatedAt: Date;
}

const clientTaskRequestSchema = new Schema<IClientTaskRequest>(
  {
    clientId: { type: Schema.Types.ObjectId, ref: "Client", required: true },
    requestedBy: { type: Schema.Types.ObjectId, ref: "User", required: true },
    title: { type: String, required: true, trim: true },
    description: { type: String, required: true },
    status: {
      type: String,
      enum: ["pending", "approved", "rejected", "in-progress", "completed"],
      default: "pending",
    },
    dueDate: { type: Date },
  },
  { timestamps: true }
);

const ClientTaskRequest: Model<IClientTaskRequest> =
  mongoose.models.ClientTaskRequest ||
  mongoose.model<IClientTaskRequest>("ClientTaskRequest", clientTaskRequestSchema);

export default ClientTaskRequest;
