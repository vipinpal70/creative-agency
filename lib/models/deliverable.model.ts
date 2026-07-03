import mongoose, { Document, Model, Schema } from "mongoose";

export type TimelineStatus =
  | "created"
  | "draft"
  | "content_internal_review"
  | "content_client_review"
  | "content_approved"
  | "design_in_progress"
  | "design_internal_review"
  | "design_client_review"
  | "design_approved"
  | "rejected"
  | "publish"
  // legacy values from before the content/design split
  | "internal_review"
  | "client_review"
  | "approved";

export interface ITimelineEntry {
  status:    TimelineStatus;
  timestamp: Date;
  changedBy: { userId: string; name: string; email: string };
}

export interface IStatusTimeline {
  writerTimeline:   ITimelineEntry[];
  designerTimeline: ITimelineEntry[];
}

export type DeliverableType =
  | "image"
  | "reel"
  | "story"
  | "reel/story"
  | "image/carousel"
  | "video"
  | "blog"
  | "ad"
  | "email-blast"
  | "seo-task"
  | "influencer-post"
  | "custom";

export type DeliverablePlatform =
  | "instagram"
  | "facebook"
  | "youtube"
  | "linkedin"
  | "x"
  | "meta-ads"
  | "google-ads"
  | "linkedin-ads"
  | "email-whatsapp"
  | "seo"
  | "influencer"
  | "custom";

export type DeliverableStatus =
  | "pending"
  | "in_progress"
  | "content_internal_review"
  | "content_client_review"
  | "content_approved"
  | "design_in_progress"
  | "design_internal_review"
  | "design_client_review"
  | "design_approved"
  | "delivered"
  // legacy values from before the content/design split
  | "internal_review"
  | "client_review"
  | "approved";

export type TeamRole =
  | "writer"
  | "designer"
  | "script_writer"
  | "video_editor"
  | "strategist"
  | "account_manager";

export interface ITeamAssignment {
  userId: mongoose.Types.ObjectId;
  role: TeamRole;
}

export interface IDeliverable extends Document {
  clientId:   mongoose.Types.ObjectId;
  scopeId:    mongoose.Types.ObjectId;
  calendarId: mongoose.Types.ObjectId;
  module: string;
  type: DeliverableType;
  platforms: string[];   // multi-platform (e.g. ["instagram", "facebook"])
  title: string;
  buckets: string[];           // content tags e.g. ["educational", "funny"]
  status: DeliverableStatus;
  assignedTeam: ITeamAssignment[];
  scheduledDate: Date;
  deliveredAt?: Date;
  publishedUrl?: string;
  notes?: string;
  statusTimeline: IStatusTimeline;
  createdAt: Date;
  updatedAt: Date;
}

const timelineEntrySchema = new Schema<ITimelineEntry>(
  {
    status:    {
      type: String,
      enum: [
        "created", "draft",
        "content_internal_review", "content_client_review", "content_approved",
        "design_in_progress", "design_internal_review", "design_client_review", "design_approved",
        "rejected", "publish",
        // legacy
        "internal_review", "client_review", "approved",
      ],
      required: true,
    },
    timestamp: { type: Date, required: true },
    changedBy: {
      userId: { type: String, required: true },
      name:   { type: String, required: true },
      email:  { type: String, required: true },
    },
  },
  { _id: false }
);

const teamAssignmentSchema = new Schema<ITeamAssignment>(
  {
    userId: { type: Schema.Types.ObjectId, ref: "User", required: true },
    role: {
      type: String,
      enum: ["writer", "designer", "script_writer", "video_editor", "strategist", "account_manager"],
      required: true,
    },
  },
  { _id: false }
);

const deliverableSchema = new Schema<IDeliverable>(
  {
    clientId:   { type: Schema.Types.ObjectId, ref: "Client",      required: true },
    scopeId:    { type: Schema.Types.ObjectId, ref: "ScopeOfWork", required: true },
    calendarId: { type: Schema.Types.ObjectId, ref: "Calendar",    required: true },
    module: { type: String, required: true },
    // No enum constraint: type comes from free-text scope item labels (e.g. "Reels", "Static Posts")
    type:      { type: String, required: true },
    // Array: one deliverable can be published on multiple platforms
    platforms: { type: [String], default: [] },
    title:     { type: String, required: true, trim: true },
    buckets:   { type: [String], default: [] },
    status: {
      type: String,
      enum: [
        "pending", "in_progress",
        "content_internal_review", "content_client_review", "content_approved",
        "design_in_progress", "design_internal_review", "design_client_review", "design_approved",
        "delivered",
        // legacy
        "internal_review", "client_review", "approved",
      ],
      default: "pending",
    },
    assignedTeam:  { type: [teamAssignmentSchema], default: [] },
    scheduledDate: { type: Date, required: true },
    deliveredAt:   { type: Date },
    publishedUrl:  { type: String, trim: true },
    notes:         { type: String, trim: true },
    statusTimeline: {
      writerTimeline:   { type: [timelineEntrySchema], default: [] },
      designerTimeline: { type: [timelineEntrySchema], default: [] },
    },
  },
  { timestamps: true }
);

deliverableSchema.index({ clientId: 1, calendarId: 1 });
deliverableSchema.index({ clientId: 1, scopeId: 1 });
deliverableSchema.index({ clientId: 1, status: 1 });
deliverableSchema.index({ clientId: 1, scheduledDate: 1 });

const Deliverable: Model<IDeliverable> =
  mongoose.models.Deliverable ||
  mongoose.model<IDeliverable>("Deliverable", deliverableSchema);

export default Deliverable;
