import mongoose, { Document, Model, Schema } from "mongoose";
import type { IRepoActor } from "@/lib/models/repo-folder.model";

export type RepoFileCategory =
  | "image"
  | "video"
  | "audio"
  | "pdf"
  | "document"
  | "spreadsheet"
  | "presentation"
  | "archive"
  | "other";

export interface IRepoFile extends Document {
  name: string;                              // display name, including extension
  folderId: mongoose.Types.ObjectId | null;  // null = repository root
  mimeType: string;
  ext: string;
  size: number;                              // bytes
  category: RepoFileCategory;
  storageKey: string;                        // filename on disk under storage/repository
  uploadedBy: IRepoActor;
  lastModifiedAt: Date;
  createdAt: Date;                           // = upload date
  updatedAt: Date;
}

const actorSchema = new Schema<IRepoActor>(
  {
    userId: { type: String, required: true },
    name: { type: String, required: true },
    email: { type: String, required: true },
  },
  { _id: false }
);

const repoFileSchema = new Schema<IRepoFile>(
  {
    name: { type: String, required: true, trim: true, maxlength: 255 },
    folderId: { type: Schema.Types.ObjectId, ref: "RepoFolder", default: null },
    mimeType: { type: String, default: "application/octet-stream" },
    ext: { type: String, default: "" },
    size: { type: Number, default: 0 },
    category: { type: String, default: "other" },
    storageKey: { type: String, required: true },
    uploadedBy: { type: actorSchema, required: true },
    lastModifiedAt: { type: Date, default: Date.now },
  },
  { timestamps: true }
);

// No two files with the same name may share a folder (root folder = null).
repoFileSchema.index({ folderId: 1, name: 1 }, { unique: true });
repoFileSchema.index({ category: 1 });

const RepoFile: Model<IRepoFile> =
  mongoose.models.RepoFile || mongoose.model<IRepoFile>("RepoFile", repoFileSchema);

export default RepoFile;
