import mongoose, { Document, Model, Schema } from "mongoose";

export interface IGanttLink extends Document {
  source:   string;
  target:   string;
  type:     string;
  clientId: mongoose.Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
}

const ganttLinkSchema = new Schema<IGanttLink>(
  {
    source:   { type: String, required: true },
    target:   { type: String, required: true },
    type:     { type: String, default: "e2s" },
    clientId: { type: Schema.Types.ObjectId, ref: "Client", required: true },
  },
  { timestamps: true }
);

ganttLinkSchema.index({ clientId: 1 });

const GanttLink: Model<IGanttLink> =
  mongoose.models.GanttLink ||
  mongoose.model<IGanttLink>("GanttLink", ganttLinkSchema);

export default GanttLink;
