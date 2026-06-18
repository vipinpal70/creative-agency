import mongoose, { Document, Model, Schema } from "mongoose";
import { TeamMemberRole, TeamMemberStatus, TeamMemberType, TEAM_ROLES } from "@/lib/team-constants";

export type UserRole = "admin" | "client" | "sub-user" | "member";

export interface IOutsourceDetails {
  companyName?: string;
  companyAddress?: string;
  bankDetails?: {
    bankName?: string;
    accountNo?: string;
    ifscCode?: string;
  };
}

export interface IUser extends Document {
  firstName: string;
  lastName?: string;
  email: string;
  password: string;
  role: UserRole;
  phone?: string;
  roles?: TeamMemberRole[];    // team member specific roles (1-3 roles)
  status: TeamMemberStatus;    // active/inactive
  type: TeamMemberType;        // internal/outsource
  outsource?: IOutsourceDetails;
  avatarColor?: string;
  lastEmailSentAt?: Date;
  createdById?: string;
  lastUpdatedById?: string;
  lastSignInAt?: Date;
  sessionToken?: string;
  sessionExpiry?: Date;
  accessToken?: string;
  createdAt: Date;
  updatedAt: Date;
}

const outsourceSchema = new Schema<IOutsourceDetails>(
  {
    companyName: { type: String, trim: true },
    companyAddress: { type: String, trim: true },
    bankDetails: {
      bankName: { type: String, trim: true },
      accountNo: { type: String, trim: true },
      ifscCode: { type: String, trim: true },
    },
  },
  { _id: false }
);

const userSchema = new Schema<IUser>(
  {
    firstName: { type: String, required: true, trim: true },
    lastName: { type: String, trim: true },
    email: { type: String, required: true, unique: true, lowercase: true, trim: true },
    password: { type: String, required: true },
    role: {
      type: String,
      enum: ["admin", "client", "sub-user", "member"],
      required: true,
    },
    phone: { type: String, trim: true },
    roles: {
      type: [String],
      enum: TEAM_ROLES as string[],
      default: [],
    },
    status: {
      type: String,
      enum: ["active", "inactive"],
      default: "active",
    },
    type: {
      type: String,
      enum: ["internal", "outsource"],
      default: "internal",
    },
    outsource: { type: outsourceSchema },
    avatarColor: { type: String, default: "#16A34A" },
    lastEmailSentAt: { type: Date },
    createdById: { type: String },
    lastUpdatedById: { type: String },
    lastSignInAt: { type: Date },
    sessionToken: { type: String },
    sessionExpiry: { type: Date },
    accessToken: { type: String },
  },
  { timestamps: true }
);

const User: Model<IUser> =
  mongoose.models.User || mongoose.model<IUser>("User", userSchema);

export default User;
