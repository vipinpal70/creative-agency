import { connectDB } from "@/lib/db";
import { AIProviderConfig, IAIProviderConfig } from "@/lib/models/ai/ai-provider-config";
import {
  LLMCapability,
  LLMProviderId,
  PROVIDERS,
  checkCompatibility,
  findTextModel,
  getDefaultSelection,
  getEnvApiKey,
} from "./catalog";
import { decryptSecret, SecretDecryptionError } from "./secret-box";
import { IMAGE_ADAPTERS, TEXT_ADAPTERS } from "./registry";
import {
  ImageGenerationRequest,
  ImageGenerationResult,
  LLMError,
  TextGenerationRequest,
  TextGenerationResult,
} from "./types";

/*
 * Runtime routing. Every AI request resolves the workspace configuration
 * (set by an admin, shared by all users) for the capability it needs — text
 * or image — at request time:
 *
 *   saved config (saved key or server key)  →  that provider + model
 *   nothing saved                           →  OpenAI defaults on OPENAI_API_KEY
 *   saved but invalid / key unusable        →  LLMError with a user-facing message
 *
 * Invalid saved configs are NOT silently replaced by defaults — the admin
 * chose a provider on purpose, so sending data elsewhere would be surprising.
 */

export type ConfigSource = "user" | "env" | "default";

export interface ResolvedSelection {
  provider: LLMProviderId;
  model: string;
  source: ConfigSource;
  options: Record<string, unknown>;
  apiKey: string;
}

export interface ResolvedTextLLM {
  provider: LLMProviderId;
  model: string;
  source: ConfigSource;
  supportsWebSearch: boolean;
  /** The provider's cheap classification model, on the same credentials. */
  routerModel: string;
  generateText(req: TextGenerationRequest): Promise<TextGenerationResult>;
}

export interface ResolvedImageLLM {
  provider: LLMProviderId;
  model: string;
  source: ConfigSource;
  options: Record<string, unknown>;
  generateImages(req: ImageGenerationRequest): Promise<ImageGenerationResult>;
}

const CAPABILITY_LABEL: Record<LLMCapability, string> = { text: "text generation", image: "image generation" };

async function loadSavedConfig(capability: LLMCapability): Promise<IAIProviderConfig | null> {
  await connectDB();
  return AIProviderConfig.findOne({ capability }).select("+encryptedApiKey").lean<IAIProviderConfig>();
}

function requireEnvKey(provider: LLMProviderId, capability: LLMCapability): string {
  const key = getEnvApiKey(provider);
  if (!key) {
    const info = PROVIDERS[provider];
    throw new LLMError(
      "missing_credentials",
      `No ${info.label} API key is configured for ${CAPABILITY_LABEL[capability]}. An admin can add one in AI Settings, or set ${info.envKeyVars[0]} on the server.`,
      provider
    );
  }
  return key;
}

export async function resolveSelection(capability: LLMCapability): Promise<ResolvedSelection> {
  const saved = await loadSavedConfig(capability);

  if (!saved) {
    const { provider, model } = getDefaultSelection(capability);
    return { provider, model, source: "default", options: {}, apiKey: requireEnvKey(provider, capability) };
  }

  const compat = checkCompatibility(capability, saved.provider, saved.model);
  if (!compat.ok) {
    throw new LLMError(
      "invalid_config",
      `The workspace ${CAPABILITY_LABEL[capability]} configuration is no longer valid: ${compat.message} An admin needs to update it in AI Settings.`
    );
  }

  const provider = saved.provider as LLMProviderId;
  let apiKey: string;
  if (saved.credentialSource === "user") {
    if (!saved.encryptedApiKey) {
      throw new LLMError("missing_credentials", "The saved API key is missing. An admin needs to re-enter it in AI Settings.", provider);
    }
    try {
      apiKey = decryptSecret(saved.encryptedApiKey);
    } catch (err) {
      if (err instanceof SecretDecryptionError) throw new LLMError("missing_credentials", err.message, provider);
      throw err;
    }
  } else {
    apiKey = requireEnvKey(provider, capability);
  }

  return {
    provider,
    model: saved.model,
    source: saved.credentialSource,
    options: saved.options ?? {},
    apiKey,
  };
}

export async function resolveTextLLM(): Promise<ResolvedTextLLM> {
  const sel = await resolveSelection("text");
  const adapter = TEXT_ADAPTERS[sel.provider];
  if (!adapter) {
    throw new LLMError("unsupported_capability", `${PROVIDERS[sel.provider].label} cannot be used for text generation.`, sel.provider);
  }
  const supportsWebSearch = !!findTextModel(sel.provider, sel.model)?.supportsWebSearch;

  return {
    provider: sel.provider,
    model: sel.model,
    source: sel.source,
    supportsWebSearch,
    routerModel: PROVIDERS[sel.provider].routerModel(),
    generateText: (req) =>
      adapter.generateText(sel.apiKey, sel.model, {
        ...req,
        // Drop the tool rather than fail when the chosen model can't search.
        webSearch: supportsWebSearch ? req.webSearch : undefined,
      }),
  };
}

export async function resolveImageLLM(): Promise<ResolvedImageLLM> {
  const sel = await resolveSelection("image");
  const adapter = IMAGE_ADAPTERS[sel.provider];
  if (!adapter) {
    // Defense in depth: checkCompatibility already rejects this, but image
    // requests must never reach a text-only provider such as Claude.
    throw new LLMError("unsupported_capability", `${PROVIDERS[sel.provider].label} does not support image generation.`, sel.provider);
  }

  return {
    provider: sel.provider,
    model: sel.model,
    source: sel.source,
    options: sel.options,
    generateImages: (req) =>
      adapter.generateImages(sel.apiKey, sel.model, {
        ...req,
        size: req.size ?? (sel.options.size as string | undefined),
      }),
  };
}
