import mongoose, { Schema, Model } from "mongoose";

/*
 * Workspace-wide AI configuration: one document per capability, set by an
 * admin and used for every user's AI requests. Text and image generation are
 * configured and resolved independently, so the workspace can run Claude for
 * text while images go to OpenAI.
 *
 * The API key is never stored in plaintext: either `encryptedApiKey` holds an
 * AES-256-GCM blob (credentialSource "user" — a key the admin saved), or the
 * application-level .env key is used (credentialSource "env") and nothing
 * secret is stored at all.
 */

export interface IAIProviderConfig {
  /** The admin who last saved this configuration (audit only). */
  updatedBy: mongoose.Types.ObjectId;
  capability: "text" | "image";
  provider: "anthropic" | "openai";
  model: string;
  credentialSource: "user" | "env";
  encryptedApiKey?: {
    iv: string;
    tag: string;
    ciphertext: string;
    keyId: string;
  };
  apiKeyHint?: string;
  /** Capability-specific settings, e.g. { size: "1024x1024" } for images. */
  options?: Record<string, unknown>;
  lastValidatedAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

const EncryptedSecretSchema = new Schema(
  {
    iv: { type: String, required: true },
    tag: { type: String, required: true },
    ciphertext: { type: String, required: true },
    keyId: { type: String, required: true },
  },
  { _id: false }
);

const AIProviderConfigSchema = new Schema<IAIProviderConfig>(
  {
    updatedBy: { type: Schema.Types.ObjectId, ref: "User", required: true },
    capability: { type: String, enum: ["text", "image"], required: true, unique: true },
    provider: { type: String, enum: ["anthropic", "openai"], required: true },
    model: { type: String, required: true, trim: true },
    credentialSource: { type: String, enum: ["user", "env"], required: true },
    // select: false — the blob is only loaded when the runtime resolver
    // explicitly asks for it, never by a casual find().
    encryptedApiKey: { type: EncryptedSecretSchema, select: false },
    apiKeyHint: { type: String },
    options: { type: Schema.Types.Mixed, default: {} },
    lastValidatedAt: { type: Date },
  },
  { timestamps: true }
);

export const AIProviderConfig: Model<IAIProviderConfig> =
  mongoose.models.AIProviderConfig ||
  mongoose.model<IAIProviderConfig>("AIProviderConfig", AIProviderConfigSchema);
