import mongoose, { Schema, Document, Model } from "mongoose";

//Every time Admin clicks Send to LLM, create a research record.
//It stores the input snapshot, prompt used, research results and final AI analysis.

export interface IAIResearch extends Document {
  clientId: mongoose.Types.ObjectId;
  projectId: mongoose.Types.ObjectId;
  initiatedBy: mongoose.Types.ObjectId;

  type: "client_onboarding";

  status:
    | "pending"
    | "researching"
    | "analyzing"
    | "completed"
    | "failed";

  promptId?: mongoose.Types.ObjectId;
  promptVersion?: number;
  promptUsed: string;

  inputSnapshot: {
    client: Record<string, any>;
  };

  businessSearch?: {
    queries: string[];
    results: Array<{
      title?: string;
      url?: string;
      snippet?: string;
      source?: string;
    }>;
  };

  competitorSearch?: {
    queries: string[];
    results: Array<{
      title?: string;
      url?: string;
      snippet?: string;
      source?: string;
    }>;
  };

  businessAnalysis?: Record<string, any>;

  competitorAnalysis?: Array<Record<string, any>>;

  finalAnalysis?: Record<string, any>;

  sources?: Array<{
    title?: string;
    url: string;
    source?: string;
  }>;

  error?: string;

  createdAt: Date;
  updatedAt: Date;
}

const AIResearchSchema = new Schema<IAIResearch>(
  {
    clientId: {
      type: Schema.Types.ObjectId,
      ref: "Client",
      required: true,
      index: true,
    },
    projectId: {
      type: Schema.Types.ObjectId,
      ref: "AIProject",
      required: true,
      index: true,
    },

    initiatedBy: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },

    type: {
      type: String,
      enum: ["client_onboarding"],
      required: true,
    },

    status: {
      type: String,
      enum: [
        "pending",
        "researching",
        "analyzing",
        "completed",
        "failed",
      ],
      default: "pending",
      index: true,
    },

    promptId: {
      type: Schema.Types.ObjectId,
      ref: "AIPrompt",
    },

    promptVersion: {
      type: Number,
    },

    promptUsed: {
      type: String,
      required: true,
    },

    inputSnapshot: {
      client: {
        type: Schema.Types.Mixed,
        required: true,
      },
    },

    businessSearch: {
      queries: {
        type: [String],
        default: [],
      },

      results: {
        type: [
          {
            title: String,
            url: String,
            snippet: String,
            source: String,
          },
        ],
        default: [],
      },
    },

    competitorSearch: {
      queries: {
        type: [String],
        default: [],
      },

      results: {
        type: [
          {
            title: String,
            url: String,
            snippet: String,
            source: String,
          },
        ],
        default: [],
      },
    },

    businessAnalysis: {
      type: Schema.Types.Mixed,
    },

    competitorAnalysis: {
      type: [Schema.Types.Mixed],
      default: [],
    },

    finalAnalysis: {
      type: Schema.Types.Mixed,
    },

    sources: {
      type: [
        {
          title: String,
          url: String,
          source: String,
        },
      ],
      default: [],
    },

    error: {
      type: String,
    },
  },
  {
    timestamps: true,
  }
);

export const AIResearch: Model<IAIResearch> =
  mongoose.models.AIResearch ||
  mongoose.model<IAIResearch>("AIResearch", AIResearchSchema);