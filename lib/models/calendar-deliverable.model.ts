import mongoose, { Document, Model, Schema } from "mongoose";

export interface ICalendarDeliverable extends Document {
  clientId: mongoose.Types.ObjectId; // Ref Client
  title: string;
  platform: "instagram" | "facebook" | "youtube" | "linkedin" | "x" | "meta-ads" | "google-ads" | "linkedin-ads" | "seo" | "email-whatsapp" | "influencer" | "custom";
  type: "reel" | "post" | "story" | "static" | "ad" | "seo-task" | "email-blast" | "influencer-campaign" | "custom";
  status: "pending" | "delivered";
  scheduledDate: Date;
  completedDate?: Date;
  publishedUrl?: string;
  notes?: string;
  createdAt: Date;
  updatedAt: Date;
}

const calendarDeliverableSchema = new Schema<ICalendarDeliverable>(
  {
    clientId: { type: Schema.Types.ObjectId, ref: "Client", required: true },
    title: { type: String, required: true, trim: true },
    platform: {
      type: String,
      enum: [
        "instagram",
        "facebook",
        "youtube",
        "linkedin",
        "x",
        "meta-ads",
        "google-ads",
        "linkedin-ads",
        "seo",
        "email-whatsapp",
        "influencer",
        "custom",
      ],
      required: true,
    },
    type: {
      type: String,
      enum: [
        "reel",
        "post",
        "story",
        "static",
        "ad",
        "seo-task",
        "email-blast",
        "influencer-campaign",
        "custom",
      ],
      required: true,
    },
    status: { type: String, enum: ["pending", "delivered"], default: "pending" },
    scheduledDate: { type: Date, required: true },
    completedDate: { type: Date },
    publishedUrl: { type: String, trim: true },
    notes: { type: String },
  },
  { timestamps: true }
);

// Indexing for quick querying
calendarDeliverableSchema.index({ clientId: 1, scheduledDate: 1 });

const CalendarDeliverable: Model<ICalendarDeliverable> =
  mongoose.models.CalendarDeliverable ||
  mongoose.model<ICalendarDeliverable>("CalendarDeliverable", calendarDeliverableSchema);

export default CalendarDeliverable;
