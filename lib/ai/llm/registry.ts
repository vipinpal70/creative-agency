import type { LLMProviderId } from "./catalog";
import type { CredentialValidator, ImageProviderAdapter, TextProviderAdapter } from "./types";
import { anthropicTextAdapter, anthropicValidator } from "./adapters/anthropic";
import { openaiImageAdapter, openaiTextAdapter, openaiValidator } from "./adapters/openai";

/*
 * Provider id → adapter. A provider missing from IMAGE_ADAPTERS simply cannot
 * be routed image requests, regardless of what's in the database.
 */
export const TEXT_ADAPTERS: Partial<Record<LLMProviderId, TextProviderAdapter>> = {
  anthropic: anthropicTextAdapter,
  openai: openaiTextAdapter,
};

export const IMAGE_ADAPTERS: Partial<Record<LLMProviderId, ImageProviderAdapter>> = {
  openai: openaiImageAdapter,
};

export const VALIDATORS: Record<LLMProviderId, CredentialValidator> = {
  anthropic: anthropicValidator,
  openai: openaiValidator,
};
