import mongoose, { Document, Model, Schema } from "mongoose";

export interface ISocialMediaScope {
  instagram: { reels: number; posts: number; stories: number; custom?: number };
  facebook: { staticCount: number; reels: number; posts: number; stories: number; custom?: number };
  youtube: { staticCount: number; reels: number; posts: number; stories: number; custom?: number };
  linkedin: { posts: number; custom?: number };
  x: { posts: number; custom?: number };
}

export interface IPaidMediaScope {
  metaAds: { adSpend: number; creatives: number; commission?: number };
  googleAds: { adSpend: number; creatives: number; commission?: number };
  linkedinAds: { adSpend: number; creatives: number; commission?: number };
}

export interface IScopeOfWork extends Document {
  clientId: mongoose.Types.ObjectId; // Ref Client
  period?: string;   // e.g. "June 2026" or "Q3 2026"
  label?: string;    // optional user-defined name
  isActive?: boolean;
  socialMedia: ISocialMediaScope;
  paidMedia: IPaidMediaScope;
  emailWhatsapp: {
    transactional: { enabled: boolean; triggers: number };
    promotional: { enabled: boolean; emails: number };
  };
  seo: {
    keywords: string[];
    gaAccess: { type: "login" | "email" | "none"; details?: string };
    gtmAccess: { type: "login" | "email" | "none"; details?: string };
    gscAccess: { type: "login" | "email" | "none"; details?: string };
    auditSheetLink?: string;
    docLink?: string;
  };
  influencer: {
    influencersCount: number;
    commission: number;
    budget: number;
  };
  createdAt: Date;
  updatedAt: Date;
}

const socialMediaScopeSchema = new Schema<ISocialMediaScope>(
  {
    instagram: {
      reels: { type: Number, default: 0 },
      posts: { type: Number, default: 0 },
      stories: { type: Number, default: 0 },
      custom: { type: Number, default: 0 },
    },
    facebook: {
      staticCount: { type: Number, default: 0 },
      reels: { type: Number, default: 0 },
      posts: { type: Number, default: 0 },
      stories: { type: Number, default: 0 },
      custom: { type: Number, default: 0 },
    },
    youtube: {
      staticCount: { type: Number, default: 0 },
      reels: { type: Number, default: 0 },
      posts: { type: Number, default: 0 },
      stories: { type: Number, default: 0 },
      custom: { type: Number, default: 0 },
    },
    linkedin: {
      posts: { type: Number, default: 0 },
      custom: { type: Number, default: 0 },
    },
    x: {
      posts: { type: Number, default: 0 },
      custom: { type: Number, default: 0 },
    },
  },
  { _id: false }
);

const paidMediaScopeSchema = new Schema<IPaidMediaScope>(
  {
    metaAds: {
      adSpend: { type: Number, default: 0 },
      creatives: { type: Number, default: 0 },
      commission: { type: Number, default: 0 },
    },
    googleAds: {
      adSpend: { type: Number, default: 0 },
      creatives: { type: Number, default: 0 },
      commission: { type: Number, default: 0 },
    },
    linkedinAds: {
      adSpend: { type: Number, default: 0 },
      creatives: { type: Number, default: 0 },
      commission: { type: Number, default: 0 },
    },
  },
  { _id: false }
);

const scopeOfWorkSchema = new Schema<IScopeOfWork>(
  {
    clientId: { type: Schema.Types.ObjectId, ref: "Client", required: true },
    period: { type: String },
    label: { type: String },
    isActive: { type: Boolean, default: true },
    socialMedia: { type: socialMediaScopeSchema, default: () => ({}) },
    paidMedia: { type: paidMediaScopeSchema, default: () => ({}) },
    emailWhatsapp: {
      transactional: {
        enabled: { type: Boolean, default: false },
        triggers: { type: Number, default: 0 },
      },
      promotional: {
        enabled: { type: Boolean, default: false },
        emails: { type: Number, default: 0 },
      },
    },
    seo: {
      keywords: { type: [String], default: [] },
      gaAccess: {
        type: { type: String, enum: ["login", "email", "none"], default: "none" },
        details: { type: String },
      },
      gtmAccess: {
        type: { type: String, enum: ["login", "email", "none"], default: "none" },
        details: { type: String },
      },
      gscAccess: {
        type: { type: String, enum: ["login", "email", "none"], default: "none" },
        details: { type: String },
      },
      auditSheetLink: { type: String },
      docLink: { type: String },
    },
    influencer: {
      influencersCount: { type: Number, default: 0 },
      commission: { type: Number, default: 0 },
      budget: { type: Number, default: 0 },
    },
  },
  { timestamps: true }
);

const ScopeOfWork: Model<IScopeOfWork> =
  mongoose.models.ScopeOfWork || mongoose.model<IScopeOfWork>("ScopeOfWork", scopeOfWorkSchema);

export default ScopeOfWork;
