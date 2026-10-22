/*
 * The single source of truth for which LLM providers and models CreativeOS
 * supports, and what each one can do. Everything else (settings validation,
 * the settings UI, runtime routing) reads capabilities from here — nothing
 * outside this file should assume "Claude does X" or "OpenAI does Y".
 *
 * Adding a model = adding one entry below. Adding a provider = adding one
 * entry here plus an adapter in ./adapters.
 */

export type LLMCapability = "text" | "image";

export type LLMProviderId = "anthropic" | "openai";

export interface TextModelInfo {
  id: string;
  label: string;
  /** Whether the provider-native web search tool can be used with this model. */
  supportsWebSearch: boolean;
  /** Reasoning models spend part of the output budget thinking; adapters pad it. */
  reasoning?: boolean;
}

export interface ImageModelInfo {
  id: string;
  label: string;
  sizes: string[];
  defaultSize: string;
  /** Maximum images per request supported by the provider for this model. */
  maxImages: number;
}

export interface ProviderInfo {
  id: LLMProviderId;
  label: string;
  /** Env vars checked (in order) for the application-level default key. */
  envKeyVars: string[];
  textModels: TextModelInfo[];
  /** Empty when the provider has no native image generation (e.g. Claude). */
  imageModels: ImageModelInfo[];
  /** Cheap/fast model used for request classification on this provider. */
  routerModel: () => string;
}

export const PROVIDERS: Record<LLMProviderId, ProviderInfo> = {
  anthropic: {
    id: "anthropic",
    label: "Anthropic Claude",
    envKeyVars: ["ANTHROPIC_API_KEY"],
    textModels: [
      { id: "claude-opus-5-5", label: "Claude Opus 5.5", supportsWebSearch: true },
      { id: "claude-sonnet-5-5", label: "Claude Sonnet 5.5", supportsWebSearch: true },
      { id: "claude-haiku-5-5", label: "Claude Haiku 5.5", supportsWebSearch: true },
      { id: "claude-sonnet-5", label: "Claude Sonnet 5", supportsWebSearch: true },
    ],
    imageModels: [],
    routerModel: () => process.env.AI_ROUTER_MODEL || "claude-haiku-4-5-20251001",
  },
  openai: {
    id: "openai",
    label: "OpenAI",
    // OPEN_API_KEY is accepted as a legacy spelling already present in some .env files.
    envKeyVars: ["OPENAI_API_KEY", "OPEN_API_KEY"],
    textModels: [
      { id: "gpt-5", label: "GPT-5", supportsWebSearch: true, reasoning: true },
      { id: "gpt-5-mini", label: "GPT-5 mini", supportsWebSearch: true, reasoning: true },
      { id: "gpt-4.1", label: "GPT-4.1", supportsWebSearch: true },
      { id: "gpt-4o", label: "GPT-4o", supportsWebSearch: true },
    ],
    imageModels: [
      {
        id: "gpt-image-1",
        label: "GPT Image 1",
        sizes: ["1024x1024", "1536x1024", "1024x1536", "auto"],
        defaultSize: "1024x1024",
        maxImages: 4,
      },
      {
        id: "gpt-image-2",
        label: "GPT Image 2",
        sizes: ["1024x1024", "1536x1024", "1024x1536", "auto"],
        defaultSize: "1024x1024",
        maxImages: 4,
      },
      {
        id: "gpt-image-1-mini",
        label: "GPT Image 1 mini",
        sizes: ["1024x1024", "1536x1024", "1024x1536", "auto"],
        defaultSize: "1024x1024",
        maxImages: 4,
      },
    ],
    routerModel: () => process.env.AI_OPENAI_ROUTER_MODEL || "gpt-4.1-mini",
  },
};

export const IMAGE_COMPATIBILITY_WARNING = {
  title: "Image Generation Compatibility Warning",
  message:
    "This model does not provide native image generation and may not be suitable for creating images. Please select a supported image-generation provider, such as OpenAI, to generate images. You can continue using Claude for text generation.",
};

export function parseCapability(value: unknown): LLMCapability | null {
  return value === "text" || value === "image" ? value : null;
}

export function isProviderId(value: unknown): value is LLMProviderId {
  return typeof value === "string" && Object.prototype.hasOwnProperty.call(PROVIDERS, value);
}

export function providerSupports(provider: LLMProviderId, capability: LLMCapability): boolean {
  const info = PROVIDERS[provider];
  return capability === "text" ? info.textModels.length > 0 : info.imageModels.length > 0;
}

/*
 * The model the .env file points at may not be in the curated list above
 * (e.g. a dated snapshot id). It's still a valid choice for backward
 * compatibility, so it's appended to the anthropic list at lookup time.
 */
function textModelsFor(provider: LLMProviderId): TextModelInfo[] {
  const models = PROVIDERS[provider].textModels;
  const envModel = provider === "anthropic" ? process.env.AI_ANTHROPIC_MODEL : process.env.AI_OPENAI_MODEL;
  if (envModel && !models.some((m) => m.id === envModel)) {
    return [...models, { id: envModel, label: `${envModel} (server default)`, supportsWebSearch: true }];
  }
  return models;
}

export function findTextModel(provider: LLMProviderId, model: string): TextModelInfo | undefined {
  return textModelsFor(provider).find((m) => m.id === model);
}

export function findImageModel(provider: LLMProviderId, model: string): ImageModelInfo | undefined {
  return PROVIDERS[provider].imageModels.find((m) => m.id === model);
}

export type CompatibilityResult =
  | { ok: true }
  | { ok: false; code: "unknown_provider" | "unknown_model" | "image_unsupported"; message: string; warning?: typeof IMAGE_COMPATIBILITY_WARNING };

/** Is `model` on `provider` a valid choice for `capability`? */
export function checkCompatibility(
  capability: LLMCapability,
  provider: unknown,
  model: unknown
): CompatibilityResult {
  if (!isProviderId(provider)) {
    return { ok: false, code: "unknown_provider", message: `Unsupported provider "${String(provider)}".` };
  }

  if (capability === "image") {
    if (!providerSupports(provider, "image")) {
      return {
        ok: false,
        code: "image_unsupported",
        message: `${PROVIDERS[provider].label} does not support image generation.`,
        warning: IMAGE_COMPATIBILITY_WARNING,
      };
    }
    if (typeof model !== "string" || !findImageModel(provider, model)) {
      // A text model picked for images (e.g. gpt-4o or a Claude id) gets the same warning.
      const isTextModel = typeof model === "string" && !!findTextModel(provider, model);
      return {
        ok: false,
        code: isTextModel ? "image_unsupported" : "unknown_model",
        message: isTextModel
          ? `"${model}" is a text model and cannot generate images.`
          : `Unsupported image model "${String(model)}" for ${PROVIDERS[provider].label}.`,
        ...(isTextModel ? { warning: IMAGE_COMPATIBILITY_WARNING } : {}),
      };
    }
    return { ok: true };
  }

  if (typeof model !== "string" || !findTextModel(provider, model)) {
    return {
      ok: false,
      code: "unknown_model",
      message: `Unsupported text model "${String(model)}" for ${PROVIDERS[provider].label}.`,
    };
  }
  return { ok: true };
}

/** Application-level key for a provider from .env, if any. Server-only. */
export function getEnvApiKey(provider: LLMProviderId): string | undefined {
  for (const name of PROVIDERS[provider].envKeyVars) {
    const value = process.env[name]?.trim();
    if (value) return value;
  }
  return undefined;
}

/*
 * Defaults used until an admin saves a workspace configuration: OpenAI for
 * both text and image generation, on the server's OPENAI_API_KEY.
 */
export function getDefaultSelection(capability: LLMCapability): { provider: LLMProviderId; model: string } {
  if (capability === "image") {
    return { provider: "openai", model: process.env.AI_OPENAI_IMAGE_MODEL || "gpt-image-1" };
  }
  return { provider: "openai", model: process.env.AI_OPENAI_MODEL || "gpt-4.1" };
}

/** Client-safe view of the catalog (no env values, only booleans). */
export function getPublicCatalog() {
  return Object.values(PROVIDERS).map((p) => ({
    id: p.id,
    label: p.label,
    supportsText: providerSupports(p.id, "text"),
    supportsImage: providerSupports(p.id, "image"),
    hasServerKey: !!getEnvApiKey(p.id),
    textModels: textModelsFor(p.id).map(({ id, label, supportsWebSearch }) => ({ id, label, supportsWebSearch })),
    imageModels: p.imageModels.map(({ id, label, sizes, defaultSize, maxImages }) => ({
      id,
      label,
      sizes,
      defaultSize,
      maxImages,
    })),
  }));
}

export type PublicCatalog = ReturnType<typeof getPublicCatalog>;
