import mongoose, { Document, Model, Schema } from "mongoose";

export interface ICompetitor {
  name: string;
  websiteLink: string;
  socialMediaLink?: string;
}

export interface ISocialPresence {
  platform: string; // e.g. "instagram", "facebook", "youtube", "linkedin", "x", "custom"
  link: string;
}

export interface ICredential {
  id: string;
  category: "social" | "paid-ads" | "analytics" | "custom";
  label: string;
  values: Record<string, string>; // username, password, etc.
}

export interface IDocument {
  id: string;
  name: string;
  fileUrl: string;
  filePath: string;
  fileSize: number;
  uploadedAt: Date;
  uploadedBy: string;
}

export interface IMeetingLog {
  id: string;
  title: string;
  notes: string;
  date: Date;
  loggedBy: string; // Name of the team member
}

export interface IClient extends Document {
  name: string;
  brandName: string;
  industry: string;
  website: string;
  status: "active" | "inactive";
  contractStart: Date;
  contractEnd: Date;
  primaryContact: {
    name: string;
    email: string;
    phone: string;
  };
  aboutBrand?: string;
  requirementNotes?: string;
  competitors: ICompetitor[];
  socialMediaPresence: ISocialPresence[];
  assignedTeam: mongoose.Types.ObjectId[]; // Ref User
  credentials: ICredential[];
  documents: IDocument[];
  meetingLogs: IMeetingLog[];
  createdAt: Date;
  updatedAt: Date;
}

const competitorSchema = new Schema<ICompetitor>(
  {
    name: { type: String, required: true, trim: true },
    websiteLink: { type: String, required: true, trim: true },
    socialMediaLink: { type: String, trim: true },
  },
  { _id: false }
);

const socialPresenceSchema = new Schema<ISocialPresence>(
  {
    platform: { type: String, required: true, trim: true },
    link: { type: String, required: true, trim: true },
  },
  { _id: false }
);

const credentialSchema = new Schema<ICredential>(
  {
    id: { type: String, required: true },
    category: { type: String, enum: ["social", "paid-ads", "analytics", "custom"], required: true },
    label: { type: String, required: true, trim: true },
    values: { type: Map, of: String, default: {} },
  },
  { _id: false }
);

const documentSchema = new Schema<IDocument>(
  {
    id: { type: String, required: true },
    name: { type: String, required: true, trim: true },
    fileUrl: { type: String, required: true, trim: true },
    filePath: { type: String, required: true, trim: true },
    fileSize: { type: Number, required: true },
    uploadedAt: { type: Date, default: Date.now },
    uploadedBy: { type: String, required: true, trim: true },
  },
  { _id: false }
);

const meetingLogSchema = new Schema<IMeetingLog>(
  {
    id: { type: String, required: true },
    title: { type: String, required: true, trim: true },
    notes: { type: String, required: true },
    date: { type: Date, required: true },
    loggedBy: { type: String, required: true },
  },
  { _id: false }
);

const clientSchema = new Schema<IClient>(
  {
    name: { type: String, required: true, trim: true },
    brandName: { type: String, required: true, trim: true },
    industry: { type: String, required: true, trim: true },
    website: { type: String, trim: true },
    status: { type: String, enum: ["active", "inactive"], default: "active" },
    contractStart: { type: Date, required: true },
    contractEnd: { type: Date, required: true },
    primaryContact: {
      name: { type: String, required: true, trim: true },
      email: { type: String, required: true, lowercase: true, trim: true },
      phone: { type: String, required: true, trim: true },
    },
    aboutBrand: { type: String },
    requirementNotes: { type: String },
    competitors: { type: [competitorSchema], default: [] },
    socialMediaPresence: { type: [socialPresenceSchema], default: [] },
    assignedTeam: [{ type: Schema.Types.ObjectId, ref: "User" }],
    credentials: { type: [credentialSchema], default: [] },
    documents: { type: [documentSchema], default: [] },
    meetingLogs: { type: [meetingLogSchema], default: [] },
  },
  { timestamps: true }
);

const Client: Model<IClient> =
  mongoose.models.Client || mongoose.model<IClient>("Client", clientSchema);

export default Client;
