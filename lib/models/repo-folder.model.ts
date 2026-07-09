import mongoose, { Document, Model, Schema } from "mongoose";

export interface IRepoActor {
  userId: string;
  name: string;
  email: string;
}

export interface IRepoFolder extends Document {
  name: string;
  parentId: mongoose.Types.ObjectId | null; // null = repository root
  createdBy: IRepoActor;
  createdAt: Date;
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

const repoFolderSchema = new Schema<IRepoFolder>(
  {
    name: { type: String, required: true, trim: true, maxlength: 200 },
    parentId: { type: Schema.Types.ObjectId, ref: "RepoFolder", default: null },
    createdBy: { type: actorSchema, required: true },
  },
  { timestamps: true }
);

// No two folders with the same name may share a parent (root parent = null).
repoFolderSchema.index({ parentId: 1, name: 1 }, { unique: true });

const RepoFolder: Model<IRepoFolder> =
  mongoose.models.RepoFolder || mongoose.model<IRepoFolder>("RepoFolder", repoFolderSchema);

export default RepoFolder;
