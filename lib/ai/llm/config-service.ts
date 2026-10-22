import mongoose from "mongoose";
import { connectDB } from "@/lib/db";
import { AIProviderConfig, IAIProviderConfig } from "@/lib/models/ai/ai-provider-config";
import {
  LLMCapability,
  LLMProviderId,
  PROVIDERS,
  checkCompatibility,
  findImageModel,
  getDefaultSelection,
  getEnvApiKey,
} from "./catalog";
import { decryptSecret, encryptSecret, keyHint, SecretDecryptionError } from "./secret-box";
import { VALIDATORS } from "./registry";
import { LLMError } from "./types";

/*
 * Settings-side operations behind /api/settings/ai-providers. The
 * configuration is workspace-wide (one per capability) and applies to every
 * user's AI requests, so only admins may read or change it. Every function
 * takes the session as `actor` and re-checks that, even though the routes
 * already do.
 *
 * Nothing returned from here ever contains an API key or its ciphertext.
 */

export interface SettingsActor {
  userId: string;
  role: string;
}

export function canManageLLMSettings(actor: { role?: string } | null | undefined): boolean {
  return actor?.role === "admin";
}

export interface ProviderConfigInput {
  provider: unknown;
  model: unknown;
  /** A new key to save. Omit to keep the stored key (same provider) or use the server key. */
  apiKey?: unknown;
  credentialSource?: unknown;
  options?: unknown;
}

export interface PublicProviderConfig {
  provider: LLMProviderId;
  model: string;
  credentialSource: "user" | "env";
  apiKeyHint?: string;
  options: Record<string, unknown>;
  lastValidatedAt?: Date;
  updatedAt?: Date;
}

export interface EffectiveConfig {
  provider: LLMProviderId;
  model: string;
  source: "user" | "env" | "default";
  ready: boolean;
  issue?: string;
}

const MAX_KEY_LENGTH = 512;

function assertAdmin(actor: SettingsActor) {
  if (!canManageLLMSettings(actor)) {
    throw new LLMError("forbidden", "Only admins can manage AI settings.");
  }
  if (!actor.userId || !mongoose.isValidObjectId(actor.userId)) {
    throw new LLMError("invalid_config", "Invalid user session.");
  }
}

function toPublic(doc: IAIProviderConfig): PublicProviderConfig {
  return {
    provider: doc.provider,
    model: doc.model,
    credentialSource: doc.credentialSource,
    apiKeyHint: doc.credentialSource === "user" ? doc.apiKeyHint : undefined,
    options: doc.options ?? {},
    lastValidatedAt: doc.lastValidatedAt,
    updatedAt: doc.updatedAt,
  };
}

function effectiveFor(capability: LLMCapability, doc: IAIProviderConfig | null): EffectiveConfig {
  if (!doc) {
    const { provider, model } = getDefaultSelection(capability);
    const ready = !!getEnvApiKey(provider);
    return {
      provider,
      model,
      source: "default",
      ready,
      ...(ready ? {} : { issue: `No server ${PROVIDERS[provider].label} key configured — save an API key.` }),
    };
  }
  const compat = checkCompatibility(capability, doc.provider, doc.model);
  if (!compat.ok) {
    return { provider: doc.provider, model: doc.model, source: doc.credentialSource, ready: false, issue: compat.message };
  }
  if (doc.credentialSource === "env" && !getEnvApiKey(doc.provider)) {
    return {
      provider: doc.provider,
      model: doc.model,
      source: "env",
      ready: false,
      issue: "The server key for this provider is no longer configured.",
    };
  }
  return { provider: doc.provider, model: doc.model, source: doc.credentialSource, ready: true };
}

export async function getLLMSettings(actor: SettingsActor) {
  assertAdmin(actor);
  await connectDB();
  const docs = await AIProviderConfig.find({}).lean<IAIProviderConfig[]>();
  const text = docs.find((d) => d.capability === "text") ?? null;
  const image = docs.find((d) => d.capability === "image") ?? null;

  return {
    text: text ? toPublic(text) : null,
    image: image ? toPublic(image) : null,
    effective: { text: effectiveFor("text", text), image: effectiveFor("image", image) },
  };
}

interface PreparedConfig {
  provider: LLMProviderId;
  model: string;
  credentialSource: "user" | "env";
  /** Plaintext key for validation; only set when a new key was submitted or reused. */
  apiKey: string;
  newKey: boolean;
  options: Record<string, unknown>;
}

async function prepare(
  actor: SettingsActor,
  capability: LLMCapability,
  input: ProviderConfigInput
): Promise<PreparedConfig> {
  assertAdmin(actor);

  const compat = checkCompatibility(capability, input.provider, input.model);
  if (!compat.ok) {
    const err = new LLMError(compat.code === "image_unsupported" ? "unsupported_capability" : "invalid_config", compat.message);
    throw Object.assign(err, { warning: compat.warning });
  }
  const provider = input.provider as LLMProviderId;
  const model = input.model as string;

  const submittedKey = typeof input.apiKey === "string" ? input.apiKey.trim() : "";
  if (submittedKey.length > MAX_KEY_LENGTH || /\s/.test(submittedKey)) {
    throw new LLMError("invalid_credentials", "That doesn't look like a valid API key.", provider);
  }

  const requestedSource =
    input.credentialSource === "env" || input.credentialSource === "user" ? input.credentialSource : undefined;

  let credentialSource: "user" | "env";
  let apiKey: string;
  let newKey = false;

  if (submittedKey && requestedSource !== "env") {
    credentialSource = "user";
    apiKey = submittedKey;
    newKey = true;
  } else if (requestedSource === "env") {
    const envKey = getEnvApiKey(provider);
    if (!envKey) {
      throw new LLMError("missing_credentials", `The server has no ${PROVIDERS[provider].label} key. Enter an API key.`, provider);
    }
    credentialSource = "env";
    apiKey = envKey;
  } else {
    // No new key: reuse the stored one, but only for the same provider —
    // an Anthropic key is never sent to OpenAI or vice versa.
    await connectDB();
    const existing = await AIProviderConfig.findOne({ capability })
      .select("+encryptedApiKey")
      .lean<IAIProviderConfig>();
    if (existing?.credentialSource === "user" && existing.provider === provider && existing.encryptedApiKey) {
      try {
        apiKey = decryptSecret(existing.encryptedApiKey);
      } catch (err) {
        if (err instanceof SecretDecryptionError) throw new LLMError("missing_credentials", err.message, provider);
        throw err;
      }
      credentialSource = "user";
    } else if (requestedSource !== "user" && getEnvApiKey(provider)) {
      credentialSource = "env";
      apiKey = getEnvApiKey(provider)!;
    } else {
      throw new LLMError("missing_credentials", `Enter a ${PROVIDERS[provider].label} API key.`, provider);
    }
  }

  const options: Record<string, unknown> = {};
  if (capability === "image") {
    const imageModel = findImageModel(provider, model)!;
    const size = (input.options as Record<string, unknown> | undefined)?.size;
    options.size = typeof size === "string" && imageModel.sizes.includes(size) ? size : imageModel.defaultSize;
  }

  return { provider, model, credentialSource, apiKey, newKey, options };
}

/** Validates compatibility and does a live credential check. Saves nothing. */
export async function testLLMConfig(actor: SettingsActor, capability: LLMCapability, input: ProviderConfigInput) {
  const prepared = await prepare(actor, capability, input);
  await VALIDATORS[prepared.provider].validate(prepared.apiKey, prepared.model);
  return { provider: prepared.provider, model: prepared.model, credentialSource: prepared.credentialSource };
}

/** Validates, live-tests, encrypts and upserts the workspace config. */
export async function saveLLMConfig(
  actor: SettingsActor,
  capability: LLMCapability,
  input: ProviderConfigInput
): Promise<PublicProviderConfig> {
  const prepared = await prepare(actor, capability, input);
  await VALIDATORS[prepared.provider].validate(prepared.apiKey, prepared.model);

  const set: Record<string, unknown> = {
    provider: prepared.provider,
    model: prepared.model,
    credentialSource: prepared.credentialSource,
    options: prepared.options,
    lastValidatedAt: new Date(),
    updatedBy: actor.userId,
  };
  const unset: Record<string, 1> = {};

  if (prepared.credentialSource === "env") {
    unset.encryptedApiKey = 1;
    unset.apiKeyHint = 1;
  } else if (prepared.newKey) {
    set.encryptedApiKey = encryptSecret(prepared.apiKey);
    set.apiKeyHint = keyHint(prepared.apiKey);
  }

  await connectDB();
  const doc = await AIProviderConfig.findOneAndUpdate(
    { capability },
    { $set: set, ...(Object.keys(unset).length ? { $unset: unset } : {}) },
    { upsert: true, new: true, setDefaultsOnInsert: true }
  ).lean<IAIProviderConfig>();

  return toPublic(doc!);
}

/** Removes the workspace config so requests fall back to the OpenAI defaults. */
export async function deleteLLMConfig(actor: SettingsActor, capability: LLMCapability) {
  assertAdmin(actor);
  await connectDB();
  await AIProviderConfig.deleteOne({ capability });
}
