import { afterEach, describe, expect, it, vi } from "vitest";
import {
  IMAGE_COMPATIBILITY_WARNING,
  checkCompatibility,
  getDefaultSelection,
  getEnvApiKey,
  getPublicCatalog,
  providerSupports,
} from "@/lib/ai/llm/catalog";

afterEach(() => vi.unstubAllEnvs());

describe("capability catalog", () => {
  it("marks Claude as text-only and OpenAI as text + image", () => {
    expect(providerSupports("anthropic", "text")).toBe(true);
    expect(providerSupports("anthropic", "image")).toBe(false);
    expect(providerSupports("openai", "text")).toBe(true);
    expect(providerSupports("openai", "image")).toBe(true);
  });

  it("rejects Claude for image generation with the compatibility warning", () => {
    const result = checkCompatibility("image", "anthropic", "claude-sonnet-5-5");
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.code).toBe("image_unsupported");
      expect(result.warning).toEqual(IMAGE_COMPATIBILITY_WARNING);
    }
  });

  it("rejects an OpenAI text model used as an image model", () => {
    const result = checkCompatibility("image", "openai", "gpt-4o");
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.code).toBe("image_unsupported");
  });

  it("rejects unknown providers and models", () => {
    expect(checkCompatibility("text", "mistral", "x").ok).toBe(false);
    expect(checkCompatibility("image", "openai", "not-a-model").ok).toBe(false);
    expect(checkCompatibility("text", "openai", "gpt-image-1").ok).toBe(false);
  });

  it("accepts supported combinations", () => {
    expect(checkCompatibility("text", "anthropic", "claude-opus-5-5").ok).toBe(true);
    expect(checkCompatibility("text", "openai", "gpt-4.1").ok).toBe(true);
    expect(checkCompatibility("image", "openai", "gpt-image-1").ok).toBe(true);
  });

  it("treats the .env Anthropic model as a valid text choice (backward compatibility)", () => {
    vi.stubEnv("AI_ANTHROPIC_MODEL", "claude-custom-snapshot-20260101");
    expect(checkCompatibility("text", "anthropic", "claude-custom-snapshot-20260101").ok).toBe(true);
  });
});

describe("environment defaults", () => {
  it("defaults both text and image to OpenAI, regardless of LLM_PROVIDER", () => {
    vi.stubEnv("LLM_PROVIDER", "anthropic");
    vi.stubEnv("AI_OPENAI_MODEL", "");
    vi.stubEnv("AI_OPENAI_IMAGE_MODEL", "");
    expect(getDefaultSelection("text")).toEqual({ provider: "openai", model: "gpt-4.1" });
    expect(getDefaultSelection("image")).toEqual({ provider: "openai", model: "gpt-image-1" });
  });

  it("reads OPENAI_API_KEY, falling back to the legacy OPEN_API_KEY spelling", () => {
    vi.stubEnv("OPENAI_API_KEY", "");
    vi.stubEnv("OPEN_API_KEY", "sk-legacy");
    expect(getEnvApiKey("openai")).toBe("sk-legacy");
    vi.stubEnv("OPENAI_API_KEY", "sk-primary");
    expect(getEnvApiKey("openai")).toBe("sk-primary");
  });

  it("public catalog exposes key presence but never key values", () => {
    vi.stubEnv("OPENAI_API_KEY", "sk-secret-value-123");
    const serialized = JSON.stringify(getPublicCatalog());
    expect(serialized).not.toContain("sk-secret-value-123");
    expect(getPublicCatalog().find((p) => p.id === "openai")?.hasServerKey).toBe(true);
  });
});
