import mongoose, { Document, Model, Schema } from "mongoose";

export interface IActivityLog extends Document {
  userId?: string;
  userEmail?: string;
  userName?: string;
  action: string;
  method: string;
  url: string;
  ip?: string;
  userAgent?: string;
  status?: number;
  requestData?: any;
  details?: string;
  createdAt: Date;
  updatedAt: Date;
}

const activityLogSchema = new Schema<IActivityLog>(
  {
    userId: { type: String, trim: true },
    userEmail: { type: String, trim: true, lowercase: true },
    userName: { type: String, trim: true },
    action: { type: String, required: true, trim: true },
    method: { type: String, required: true, uppercase: true },
    url: { type: String, required: true, trim: true },
    ip: { type: String, trim: true },
    userAgent: { type: String, trim: true },
    status: { type: Number },
    requestData: { type: Schema.Types.Mixed },
    details: { type: String, trim: true },
  },
  { timestamps: true }
);

const ActivityLog: Model<IActivityLog> =
  mongoose.models.ActivityLog ||
  mongoose.model<IActivityLog>("ActivityLog", activityLogSchema);

export default ActivityLog;
