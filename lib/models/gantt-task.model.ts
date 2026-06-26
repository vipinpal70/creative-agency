import mongoose, { Document, Model, Schema } from "mongoose";

export interface IGanttTask extends Document {
  text:      string;
  start:     Date;
  end?:      Date | null;
  duration:  number;
  progress:  number;
  type:      string;   // "task" | "summary" | "milestone"
  parent?:   string | null;
  orderId:   number;
  clientId:  mongoose.Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
}

const ganttTaskSchema = new Schema<IGanttTask>(
  {
    text:     { type: String, required: true, default: "New Task" },
    start:    { type: Date,   required: true, default: () => new Date() },
    end:      { type: Date,   default: null },
    duration: { type: Number, required: true, default: 1 },
    progress: { type: Number, required: true, default: 0 },
    type:     { type: String, default: "task" },
    parent:   { type: String, default: null },
    orderId:  { type: Number, required: true, default: 0 },
    clientId: { type: Schema.Types.ObjectId, ref: "Client", required: true },
  },
  { timestamps: true }
);

ganttTaskSchema.index({ clientId: 1, orderId: 1 });
ganttTaskSchema.index({ clientId: 1, parent: 1 });

const GanttTask: Model<IGanttTask> =
  mongoose.models.GanttTask ||
  mongoose.model<IGanttTask>("GanttTask", ganttTaskSchema);

export default GanttTask;
