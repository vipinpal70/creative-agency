import mongoose, { Document, Model, Schema } from "mongoose";

export interface IRepoActor {
  userId: string;
  name: string;
  email: string;
}

export interface IRepoFolder extends Document {
  name: string;
  parentId: mongoose.Types.ObjectId | null; // null = repository root
  // Owning client. null = agency-internal (visible to staff only). A client
  // user only ever sees folders tagged with their own clientId.
  clientId: mongoose.Types.ObjectId | null;
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
    clientId: { type: Schema.Types.ObjectId, ref: "Client", default: null },
    createdBy: { type: actorSchema, required: true },
  },
  { timestamps: true }
);

// No two folders with the same name may share a parent within the same client
// scope (root parent = null; agency-internal clientId = null).
repoFolderSchema.index({ parentId: 1, clientId: 1, name: 1 }, { unique: true });
repoFolderSchema.index({ clientId: 1 });

const RepoFolder: Model<IRepoFolder> =
  mongoose.models.RepoFolder || mongoose.model<IRepoFolder>("RepoFolder", repoFolderSchema);

export default RepoFolder;
