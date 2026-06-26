import mongoose, { Document, Model, Schema } from "mongoose";

export interface ICreativeUpload extends Document {
  assetName: string;
  clientId: mongoose.Types.ObjectId | string;
  uploadedAt: Date;
  uploadedById: string;
  fileType: string;
  fileSize: number;
  fileUrl: string;
  filePath: string;
}

const creativeUploadSchema = new Schema<ICreativeUpload>(
  {
    assetName: { type: String, required: true },
    clientId: { type: Schema.Types.ObjectId, ref: "Client", required: true },
    uploadedAt: { type: Date, default: Date.now },
    uploadedById: { type: String, required: true },
    fileType: { type: String, required: true },
    fileSize: { type: Number, required: true },
    fileUrl: { type: String, required: true },
    filePath: { type: String, required: true },
  },
  { timestamps: true }
);

const CreativeUpload: Model<ICreativeUpload> =
  mongoose.models.CreativeUpload || mongoose.model<ICreativeUpload>("CreativeUpload", creativeUploadSchema);

export default CreativeUpload;
