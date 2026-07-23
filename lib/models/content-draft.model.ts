import mongoose, { Document, Model, Schema } from "mongoose";
import type { DraftStatus } from "@/lib/status-flow";

export type { DraftStatus } from "@/lib/status-flow";

export interface ILastChangedBy {
  userId:    string;
  name:      string;
  email:     string;
  changedAt: Date;
}

// Designer who claimed the item via "Start Work" — locks design-phase edits to them
export interface IDesignStartedBy {
  userId:    string;
  name:      string;
  email:     string;
  startedAt: Date;
}

export interface IContentDraft extends Document {
  clientId:       mongoose.Types.ObjectId;
  calendarId:     mongoose.Types.ObjectId;
  deliverableId:  mongoose.Types.ObjectId;
  version:        number;          // auto-incremented per deliverable
  createdBy:      mongoose.Types.ObjectId;
  lastChangedBy:  ILastChangedBy | null;

  mediaType:      string;
  creativeCopy:   string;          // used for non-carousel posts
  frames:         { frameNo: number; copy: string; imageUrl: string }[]; // carousel frames
  imageUrl:       string;          // static image / GIF / story image URL
  videoUrl:       string;          // video / reel file URL
  thumbnailUrl:   string;          // video thumbnail image URL
  audioUrl:       string;          // audio / podcast file URL
  caption:        string;
  hashtags:       string[];
  publishDate:    Date | null;
  publishTime:    string | null;
  referenceUrl:   string;
  videoType:      string;
  videoNotes:     string;
  articleMode:    string;   // "with-creative" | "without-creative" | "" — only for article/copy media type
  articleCopy:    string;   // written article/copy text — only for article/copy media type
  notes:          string;

  status:         DraftStatus;
  rejectionNote:  string;
  designStartedBy: IDesignStartedBy | null;

  // Soft-archive: when set, the copy is hidden from active lists but retained
  // (and still visible in the designer Rejected tab / Archived page) until it is
  // permanently deleted — manually by an admin or automatically 14 days later.
  archivedAt:     Date | null;
  archivedBy:     ILastChangedBy | null;

  createdAt: Date;
  updatedAt: Date;
}

const contentDraftSchema = new Schema<IContentDraft>(
  {
    clientId:      { type: Schema.Types.ObjectId, ref: "Client",      required: true },
    calendarId:    { type: Schema.Types.ObjectId, ref: "Calendar",    required: true },
    deliverableId: { type: Schema.Types.ObjectId, ref: "Deliverable", required: true },
    version:       { type: Number, required: true, default: 1 },
    createdBy:     { type: Schema.Types.ObjectId, ref: "User",        required: true },

    mediaType:     { type: String, default: "" },
    creativeCopy:  { type: String, default: "" },
    frames: {
      type: [{ frameNo: Number, copy: String, imageUrl: String }],
      default: [],
    },
    imageUrl:      { type: String, default: "" },
    videoUrl:      { type: String, default: "" },
    thumbnailUrl:  { type: String, default: "" },
    audioUrl:      { type: String, default: "" },
    caption:       { type: String, default: "" },
    hashtags:      { type: [String], default: [] },
    publishDate:   { type: Date, default: null },
    publishTime:   { type: String, default: null },
    referenceUrl:  { type: String, default: "" },
    videoType:     { type: String, default: "" },
    videoNotes:    { type: String, default: "" },
    articleMode:   { type: String, default: "" },
    articleCopy:   { type: String, default: "" },
    notes:         { type: String, default: "" },

    status:        {
      type: String,
      enum: [
        "draft",
        "content_internal_review",
        "content_client_review",
        "content_approved",
        "content_req_change",
        "design_in_progress",
        "design_internal_review",
        "design_client_review",
        "design_approved",
        "design_req_change",
        "rejected",
        // legacy values from before the content/design split
        "submitted",
        "approved",
      ],
      default: "draft",
    },
    rejectionNote: { type: String, default: "" },

    lastChangedBy: {
      type: {
        userId:    { type: String, required: true },
        name:      { type: String, required: true },
        email:     { type: String, required: true },
        changedAt: { type: Date,   required: true },
      },
      default: null,
    },

    designStartedBy: {
      type: {
        userId:    { type: String, required: true },
        name:      { type: String, required: true },
        email:     { type: String, required: true },
        startedAt: { type: Date,   required: true },
      },
      default: null,
    },

    archivedAt: { type: Date, default: null },
    archivedBy: {
      type: {
        userId:    { type: String, required: true },
        name:      { type: String, required: true },
        email:     { type: String, required: true },
        changedAt: { type: Date,   required: true },
      },
      default: null,
    },
  },
  { timestamps: true }
);

contentDraftSchema.index({ deliverableId: 1, version: 1 }, { unique: true });
contentDraftSchema.index({ clientId: 1, calendarId: 1 });
contentDraftSchema.index({ createdBy: 1, status: 1 });
// Cleanup job scans archived copies by archive date; active-list queries filter
// on archivedAt: null.
contentDraftSchema.index({ archivedAt: 1 });

const ContentDraft: Model<IContentDraft> =
  mongoose.models.ContentDraft ||
  mongoose.model<IContentDraft>("ContentDraft", contentDraftSchema);

export default ContentDraft;
