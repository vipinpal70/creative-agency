import mongoose, { Document, Model, Schema } from "mongoose";

export interface IScopeItem {
  id: string;          // Frontend UUID / ID string
  module: string;      // e.g. "social", "paid", "seo", "email", "website", "influencer", "custom"
  label: string;       // e.g. "Reels", "Posts per month", "Blogs", "Ad Spend"
  unit?: string;       // e.g. "qty", "hrs", "usd"
  committed: number;   // Committed quantity
  delivered: number;   // Default 0
  platforms?: string[]; // E.g. ["instagram", "facebook", "linkedin", "youtube", "x"] (only for social module)
}

export interface IScopeOfWork extends Document {
  clientId: mongoose.Types.ObjectId; // Ref Client
  period?: string;   // e.g. "June 2026" or "Q3 2026"
  label?: string;    // optional user-defined name
  isActive?: boolean;
  items: IScopeItem[];
  createdAt: Date;
  updatedAt: Date;
}

const scopeItemSchema = new Schema<IScopeItem>(
  {
    id: { type: String, required: true },
    module: { type: String, required: true },
    label: { type: String, required: true },
    unit: { type: String, default: "qty" },
    committed: { type: Number, required: true, default: 0 },
    delivered: { type: Number, required: true, default: 0 },
    platforms: { type: [String], default: [] },
  },
  { _id: false }
);

const scopeOfWorkSchema = new Schema<IScopeOfWork>(
  {
    clientId: { type: Schema.Types.ObjectId, ref: "Client", required: true },
    period: { type: String },
    label: { type: String },
    isActive: { type: Boolean, default: true },
    items: { type: [scopeItemSchema], default: [] },
  },
  { timestamps: true }
);

// Indexing for quick querying
scopeOfWorkSchema.index({ clientId: 1, isActive: 1 });

const ScopeOfWork: Model<IScopeOfWork> =
  mongoose.models.ScopeOfWork || mongoose.model<IScopeOfWork>("ScopeOfWork", scopeOfWorkSchema);

export default ScopeOfWork;
