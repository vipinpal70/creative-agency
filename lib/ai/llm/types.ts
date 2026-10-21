import type { LLMProviderId } from "./catalog";

/*
 * Provider-neutral request/response shapes. Business logic (copywriting,
 * research, chat) only ever talks in these types; each adapter translates to
 * and from its vendor's API.
 */

export interface TextMessage {
  role: "user" | "assistant";
  content: string;
  /**
   * Provider-native form of an assistant turn (e.g. Claude content blocks
   * including web-search results). Adapters of the same provider replay it so
   * follow-up turns keep full context; other providers fall back to `content`.
   */
  native?: { provider: LLMProviderId; value: unknown };
}

export interface StructuredOutputSpec {
  name: string;
  description: string;
  /** JSON Schema for the object the model must return. */
  schema: Record<string, unknown>;
}

export interface TextGenerationRequest {
  system?: string;
  messages: TextMessage[];
  maxTokens: number;
  /** Enables the provider's native web search when the model supports it. */
  webSearch?: { maxUses: number };
  /** Forces the model to return one object matching the schema. */
  structuredOutput?: StructuredOutputSpec;
  /** Overrides the configured model for this call (e.g. the cheap router model). */
  modelOverride?: string;
}

export interface TextGenerationResult {
  text: string;
  /** Present when `structuredOutput` was requested and the model complied. */
  structured?: unknown;
  /** The assistant turn, ready to append to `messages` for a follow-up call. */
  assistantMessage: TextMessage;
  inputTokens: number;
  outputTokens: number;
  webSearchCount: number;
  provider: LLMProviderId;
  model: string;
}

export interface TextProviderAdapter {
  generateText(apiKey: string, model: string, req: TextGenerationRequest): Promise<TextGenerationResult>;
}

export interface ImageGenerationRequest {
  prompt: string;
  size?: string;
  n?: number;
}

export interface GeneratedImage {
  /** data:image/png;base64,... */
  dataUrl: string;
  revisedPrompt?: string;
}

export interface ImageGenerationResult {
  images: GeneratedImage[];
  provider: LLMProviderId;
  model: string;
}

export interface ImageProviderAdapter {
  generateImages(apiKey: string, model: string, req: ImageGenerationRequest): Promise<ImageGenerationResult>;
}

export interface CredentialValidator {
  /** Cheap live check that the key works and the model is reachable with it. */
  validate(apiKey: string, model: string): Promise<void>;
}

export type LLMErrorCode =
  | "missing_credentials"
  | "invalid_credentials"
  | "model_unavailable"
  | "provider_unavailable"
  | "invalid_config"
  | "unsupported_capability"
  | "rate_limited"
  | "provider_error"
  | "forbidden";

const STATUS_FOR_CODE: Record<LLMErrorCode, number> = {
  missing_credentials: 422,
  invalid_credentials: 422,
  model_unavailable: 422,
  provider_unavailable: 503,
  invalid_config: 422,
  unsupported_capability: 422,
  rate_limited: 429,
  provider_error: 502,
  forbidden: 403,
};

/*
 * The only error type that leaves the LLM layer. Messages are written for end
 * users and are guaranteed never to contain an API key — adapters build them
 * from status codes, not from raw vendor error bodies.
 */
export class LLMError extends Error {
  readonly code: LLMErrorCode;
  readonly status: number;
  readonly provider?: LLMProviderId;

  constructor(code: LLMErrorCode, message: string, provider?: LLMProviderId) {
    super(message);
    this.name = "LLMError";
    this.code = code;
    this.status = STATUS_FOR_CODE[code];
    this.provider = provider;
  }
}

export function isLLMError(err: unknown): err is LLMError {
  return err instanceof LLMError;
}
