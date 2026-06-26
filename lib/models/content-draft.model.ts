import mongoose, { Document, Model, Schema } from "mongoose";

export type DraftStatus = "draft" | "submitted" | "approved" | "rejected";

export interface ILastChangedBy {
  userId:    string;
  name:      string;
  email:     string;
  changedAt: Date;
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
      enum: ["draft", "submitted", "approved", "rejected"],
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
  },
  { timestamps: true }
);

contentDraftSchema.index({ deliverableId: 1, version: 1 }, { unique: true });
contentDraftSchema.index({ clientId: 1, calendarId: 1 });
contentDraftSchema.index({ createdBy: 1, status: 1 });

const ContentDraft: Model<IContentDraft> =
  mongoose.models.ContentDraft ||
  mongoose.model<IContentDraft>("ContentDraft", contentDraftSchema);

export default ContentDraft;
