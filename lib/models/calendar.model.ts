import mongoose, { Document, Model, Schema } from "mongoose";

export type CalendarModule =
  | "social"
  | "paid"
  | "seo"
  | "email"
  | "influencer"
  | "website"
  | "orm"
  | "video"
  | "design"
  | "custom";

export type CalendarStatus = "draft" | "active" | "completed" | "paused";

export interface IPlannedItem {
  scopeItemId: string;      // matches the `id` string field on the ScopeOfWork item
  label: string;            // e.g. "reel/story", "static", "post"
  type: string;             // deliverable type (reel/story, image/carousel, post, etc.)
  platforms: string[];      // ["instagram", "facebook"]
  plannedQty: number;       // how many we plan to deliver in THIS calendar (user input)
  totalInScope: number;     // total agreed in scope (auto-read, for reference)
}

export interface ICalendar extends Document {
  clientId:   mongoose.Types.ObjectId;
  scopeId:    mongoose.Types.ObjectId;
  createdBy:  mongoose.Types.ObjectId;  // auto from session
  module:     CalendarModule;
  name:       string;
  objective:  string;
  startDate:  Date;
  endDate:    Date;
  status:     CalendarStatus;
  plannedItems: IPlannedItem[];
  buckets:    string[];
  createdAt:  Date;
  updatedAt:  Date;
}

const plannedItemSchema = new Schema<IPlannedItem>(
  {
    scopeItemId:  { type: String, required: true },
    label:        { type: String, required: true },
    type:         { type: String, required: true },
    platforms:    { type: [String], default: [] },
    plannedQty:   { type: Number, required: true, min: 1 },
    totalInScope: { type: Number, required: true, min: 0 },
  },
  { _id: false }
);

const calendarSchema = new Schema<ICalendar>(
  {
    clientId:  { type: Schema.Types.ObjectId, ref: "Client",      required: true },
    scopeId:   { type: Schema.Types.ObjectId, ref: "ScopeOfWork", required: true },
    createdBy: { type: Schema.Types.ObjectId, ref: "User",        required: true },
    module: {
      type: String,
      enum: ["social", "paid", "seo", "email", "influencer", "website", "orm", "video", "design", "custom"],
      required: true,
    },
    name:      { type: String, required: true, trim: true },
    objective: { type: String, default: "",   trim: true },
    startDate: { type: Date, required: true },
    endDate:   { type: Date, required: true },
    status: {
      type: String,
      enum: ["draft", "active", "completed", "paused"],
      default: "draft",
    },
    plannedItems: { type: [plannedItemSchema], default: [] },
    buckets:      { type: [String], default: [] },
  },
  { timestamps: true }
);

calendarSchema.index({ clientId: 1, module: 1 });
calendarSchema.index({ clientId: 1, scopeId: 1 });
calendarSchema.index({ clientId: 1, status: 1 });
calendarSchema.index({ createdBy: 1 });

// Enforce: only one non-completed calendar per (client, scope, module) at a time.
// partialFilterExpression targets only draft/active/paused documents so completed
// calendars don't block creation of the next period's calendar.
calendarSchema.index(
  { clientId: 1, scopeId: 1, module: 1 },
  {
    unique: true,
    partialFilterExpression: { status: { $in: ["draft", "active", "paused"] } },
    name: "unique_active_calendar_per_scope_module",
  }
);

const Calendar: Model<ICalendar> =
  mongoose.models.Calendar || mongoose.model<ICalendar>("Calendar", calendarSchema);

export default Calendar;
