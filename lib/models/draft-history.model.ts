import mongoose, { Document, Model, Schema } from "mongoose";

export type HistoryAction = "created" | "edited" | "submitted" | "approved" | "rejected";

export interface IChangeField {
  field: string;   // machine name, e.g. "creativeCopy"
  label: string;   // human label, e.g. "Creative Copy"
  from:  string;   // serialised old value
  to:    string;   // serialised new value
}

export interface IDraftHistory extends Document {
  clientId:      mongoose.Types.ObjectId;
  calendarId:    mongoose.Types.ObjectId;
  deliverableId: mongoose.Types.ObjectId;
  draftId:       mongoose.Types.ObjectId;
  draftVersion:  number;
  action:        HistoryAction;
  changedBy: {
    userId: string;
    name:   string;
    email:  string;
  };
  changedAt: Date;
  changes:   IChangeField[];
}

const changeFieldSchema = new Schema<IChangeField>(
  {
    field: { type: String, required: true },
    label: { type: String, required: true },
    from:  { type: String, default: "" },
    to:    { type: String, default: "" },
  },
  { _id: false }
);

const draftHistorySchema = new Schema<IDraftHistory>(
  {
    clientId:      { type: Schema.Types.ObjectId, ref: "Client",      required: true },
    calendarId:    { type: Schema.Types.ObjectId, ref: "Calendar",    required: true },
    deliverableId: { type: Schema.Types.ObjectId, ref: "Deliverable", required: true },
    draftId:       { type: Schema.Types.ObjectId, ref: "ContentDraft", required: true },
    draftVersion:  { type: Number, required: true },
    action:        {
      type:     String,
      enum:     ["created", "edited", "submitted", "approved", "rejected"],
      required: true,
    },
    changedBy: {
      userId: { type: String, required: true },
      name:   { type: String, required: true },
      email:  { type: String, required: true },
    },
    changedAt: { type: Date, required: true, default: () => new Date() },
    changes:   { type: [changeFieldSchema], default: [] },
  },
  { timestamps: false }
);

draftHistorySchema.index({ draftId: 1, changedAt: -1 });
draftHistorySchema.index({ deliverableId: 1, changedAt: -1 });

const DraftHistory: Model<IDraftHistory> =
  mongoose.models.DraftHistory ||
  mongoose.model<IDraftHistory>("DraftHistory", draftHistorySchema);

export default DraftHistory;
