import mongoose, { Document, Model, Schema } from "mongoose";
import { TASK_STATUS_ENUM as STATUS_ENUM } from "../task-status";
import type { TaskStatus, TaskPriority } from "../task-status";

export { TASK_STATUSES, normalizeTaskStatus } from "../task-status";
export type { TaskStatus, TaskPriority } from "../task-status";

export interface ISubTask {
  title: string;
  status: TaskStatus;
}

export interface IComment {
  text: string;
  authorId: mongoose.Types.ObjectId;
  createdAt: Date;
}

export interface ITaskAttachment {
  fileUrl: string;
  fileName: string;
  uploadedAt: Date;
}

export interface ITask extends Document {
  title: string;
  description?: string;
  status: TaskStatus;
  priority: TaskPriority;
  mediaUrls: string[];
  feedbacks: string[];
  countSubTask: number;
  startDate?: Date;
  endDate?: Date;
  clientId: mongoose.Types.ObjectId;
  organizationId: string;
  createdById?: mongoose.Types.ObjectId;
  assignedToId?: mongoose.Types.ObjectId;
  category?: string;
  module?: string; // Scope-of-work module, e.g. "social", "paid", "seo"
  
  // Role-specific assignees
  writerId?: mongoose.Types.ObjectId;
  editorId?: mongoose.Types.ObjectId;
  designerId?: mongoose.Types.ObjectId;
  videoEditorId?: mongoose.Types.ObjectId;

  // Per-role statuses
  writerStatus: TaskStatus;
  editorStatus: TaskStatus;
  designerStatus: TaskStatus;
  videoEditorStatus: TaskStatus;

  // Content bucket link / copy link / calendar link
  contentBucketId?: string;
  calendarCopyId?: string;
  calendarId?: mongoose.Types.ObjectId;

  subTasks: ISubTask[];
  comments: IComment[];
  attachments: ITaskAttachment[];
  assets: string[];
  createdAt: Date;
  updatedAt: Date;
}

const subTaskSchema = new Schema<ISubTask>({
  title: { type: String, required: true },
  status: {
    type: String,
    enum: STATUS_ENUM,
    default: "OPEN"
  }
});

const commentSchema = new Schema<IComment>({
  text: { type: String, required: true },
  authorId: { type: Schema.Types.ObjectId, ref: "User", required: true },
  createdAt: { type: Date, default: Date.now }
});

const taskAttachmentSchema = new Schema<ITaskAttachment>({
  fileUrl: { type: String, required: true },
  fileName: { type: String, required: true },
  uploadedAt: { type: Date, default: Date.now }
});

const taskSchema = new Schema<ITask>(
  {
    title: { type: String, required: true, trim: true },
    description: { type: String, trim: true },
    status: {
      type: String,
      enum: STATUS_ENUM,
      default: "OPEN"
    },
    priority: {
      type: String,
      enum: ["LOW", "MEDIUM", "HIGH", "URGENT"],
      default: "MEDIUM"
    },
    mediaUrls: { type: [String], default: [] },
    feedbacks: { type: [String], default: [] },
    countSubTask: { type: Number, default: 0 },
    startDate: { type: Date },
    endDate: { type: Date },
    clientId: { type: Schema.Types.ObjectId, ref: "Client", required: true },
    organizationId: { type: String, required: true },
    createdById: { type: Schema.Types.ObjectId, ref: "User" },
    assignedToId: { type: Schema.Types.ObjectId, ref: "User" },
    category: { type: String },
    module: { type: String },

    // Role-specific assignees
    writerId: { type: Schema.Types.ObjectId, ref: "User" },
    editorId: { type: Schema.Types.ObjectId, ref: "User" },
    designerId: { type: Schema.Types.ObjectId, ref: "User" },
    videoEditorId: { type: Schema.Types.ObjectId, ref: "User" },

    // Per-role statuses
    writerStatus: { type: String, enum: STATUS_ENUM, default: "OPEN" },
    editorStatus: { type: String, enum: STATUS_ENUM, default: "OPEN" },
    designerStatus: { type: String, enum: STATUS_ENUM, default: "OPEN" },
    videoEditorStatus: { type: String, enum: STATUS_ENUM, default: "OPEN" },

    // Links
    contentBucketId: { type: String },
    calendarCopyId: { type: String },
    calendarId: { type: Schema.Types.ObjectId, ref: "Calendar" },

    subTasks: { type: [subTaskSchema], default: [] },
    comments: { type: [commentSchema], default: [] },
    attachments: { type: [taskAttachmentSchema], default: [] },
    assets: { type: [String], default: [] }
  },
  { timestamps: true }
);

taskSchema.index({ clientId: 1 });
taskSchema.index({ assignedToId: 1 });
taskSchema.index({ status: 1 });
taskSchema.index({ endDate: 1 });
taskSchema.index({ contentBucketId: 1 });

const Task: Model<ITask> =
  mongoose.models.Task || mongoose.model<ITask>("Task", taskSchema);

export default Task;
