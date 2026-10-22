import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => {
  const textResult = (provider: string, model: string) => ({
    text: "ok",
    assistantMessage: { role: "assistant", content: "ok" },
    inputTokens: 1,
    outputTokens: 1,
    webSearchCount: 0,
    provider,
    model,
  });
  return {
    anthropicText: vi.fn(async (_key: string, model: string) => textResult("anthropic", model)),
    openaiText: vi.fn(async (_key: string, model: string) => textResult("openai", model)),
    openaiImage: vi.fn(async (_key: string, model: string) => ({ images: [{ dataUrl: "data:" }], provider: "openai", model })),
  };
});

vi.mock("@/lib/db", () => ({ connectDB: vi.fn(async () => undefined) }));
vi.mock("@/lib/models/ai/ai-provider-config", async () => {
  const { createFakeConfigModel } = await import("./fake-config-model");
  return { AIProviderConfig: createFakeConfigModel() };
});
vi.mock("@/lib/ai/llm/registry", () => ({
  TEXT_ADAPTERS: {
    anthropic: { generateText: mocks.anthropicText },
    openai: { generateText: mocks.openaiText },
  },
  IMAGE_ADAPTERS: { openai: { generateImages: mocks.openaiImage } },
  VALIDATORS: {
    anthropic: { validate: vi.fn(async () => undefined) },
    openai: { validate: vi.fn(async () => undefined) },
  },
}));

import type { FakeDoc } from "./fake-config-model";
import { AIProviderConfig } from "@/lib/models/ai/ai-provider-config";
import { saveLLMConfig } from "@/lib/ai/llm/config-service";
import { resolveImageLLM, resolveTextLLM } from "@/lib/ai/llm/resolve";
import { encryptSecret } from "@/lib/ai/llm/secret-box";

const store = (AIProviderConfig as unknown as { docs: FakeDoc[] }).docs;
const ADMIN = { userId: "64b7f0000000000000000001", role: "admin" };

beforeEach(() => {
  store.length = 0;
  vi.clearAllMocks();
  vi.stubEnv("JWT_SECRET", "test-jwt-secret");
  vi.stubEnv("LLM_CREDENTIALS_KEY", "");
  // Legacy .env values must not change the OpenAI default.
  vi.stubEnv("LLM_PROVIDER", "anthropic");
  vi.stubEnv("AI_ANTHROPIC_MODEL", "claude-sonnet-5");
  vi.stubEnv("AI_OPENAI_MODEL", "");
  vi.stubEnv("AI_OPENAI_IMAGE_MODEL", "");
  vi.stubEnv("ANTHROPIC_API_KEY", "sk-ant-server");
  vi.stubEnv("OPENAI_API_KEY", "sk-openai-server");
  vi.stubEnv("OPEN_API_KEY", "");
});
afterEach(() => vi.unstubAllEnvs());

const req = { messages: [{ role: "user" as const, content: "hi" }], maxTokens: 10 };

describe("fallback behavior", () => {
  it("defaults text to OpenAI on the server key, even with LLM_PROVIDER=anthropic", async () => {
    const llm = await resolveTextLLM();
    expect(llm).toMatchObject({ provider: "openai", model: "gpt-4.1", source: "default" });
    await llm.generateText(req);
    expect(mocks.openaiText).toHaveBeenCalledWith("sk-openai-server", "gpt-4.1", expect.anything());
    expect(mocks.anthropicText).not.toHaveBeenCalled();
  });

  it("defaults images to OpenAI on the server key", async () => {
    const llm = await resolveImageLLM();
    await llm.generateImages({ prompt: "a cat" });
    expect(mocks.openaiImage).toHaveBeenCalledWith("sk-openai-server", "gpt-image-1", expect.anything());
  });

  it("honours AI_OPENAI_MODEL / AI_OPENAI_IMAGE_MODEL overrides", async () => {
    vi.stubEnv("AI_OPENAI_MODEL", "gpt-5-mini");
    vi.stubEnv("AI_OPENAI_IMAGE_MODEL", "gpt-image-2");
    expect((await resolveTextLLM()).model).toBe("gpt-5-mini");
    expect((await resolveImageLLM()).model).toBe("gpt-image-2");
  });

  it("errors clearly when no OpenAI key exists for the defaults", async () => {
    vi.stubEnv("OPENAI_API_KEY", "");
    await expect(resolveTextLLM()).rejects.toMatchObject({ code: "missing_credentials", status: 422 });
    await expect(resolveImageLLM()).rejects.toMatchObject({ code: "missing_credentials" });
  });
});

describe("provider routing (workspace-wide)", () => {
  it("routes every request to the admin's chosen text provider with the saved key", async () => {
    await saveLLMConfig(ADMIN, "text", { provider: "anthropic", model: "claude-opus-5-5", apiKey: "sk-ant-workspace" });

    // Any user's request resolves the same workspace configuration.
    await (await resolveTextLLM()).generateText(req);
    await (await resolveTextLLM()).generateText(req);

    expect(mocks.anthropicText).toHaveBeenCalledTimes(2);
    expect(mocks.anthropicText).toHaveBeenCalledWith("sk-ant-workspace", "claude-opus-5-5", expect.anything());
    expect(mocks.openaiText).not.toHaveBeenCalled();
  });

  it("keeps Claude for text while images stay on OpenAI", async () => {
    await saveLLMConfig(ADMIN, "text", { provider: "anthropic", model: "claude-opus-5-5", credentialSource: "env" });

    await (await resolveTextLLM()).generateText(req);
    await (await resolveImageLLM()).generateImages({ prompt: "logo" });

    expect(mocks.anthropicText).toHaveBeenCalledWith("sk-ant-server", "claude-opus-5-5", expect.anything());
    expect(mocks.openaiImage).toHaveBeenCalledWith("sk-openai-server", "gpt-image-1", expect.anything());
  });

  it("applies the saved image size", async () => {
    await saveLLMConfig(ADMIN, "image", { provider: "openai", model: "gpt-image-1-mini", credentialSource: "env", options: { size: "1024x1536" } });
    await (await resolveImageLLM()).generateImages({ prompt: "poster" });
    expect(mocks.openaiImage).toHaveBeenCalledWith("sk-openai-server", "gpt-image-1-mini", expect.objectContaining({ size: "1024x1536" }));
  });

  it("never routes image requests to Claude, even from a tampered record", async () => {
    store.push({
      updatedBy: ADMIN.userId,
      capability: "image",
      provider: "anthropic",
      model: "claude-sonnet-5-5",
      credentialSource: "user",
      encryptedApiKey: encryptSecret("sk-ant-admin"),
    });
    await expect(resolveImageLLM()).rejects.toMatchObject({ code: "invalid_config" });
    expect(mocks.anthropicText).not.toHaveBeenCalled();
    expect(mocks.openaiImage).not.toHaveBeenCalled();
  });

  it("reports an unreadable stored key instead of falling back silently", async () => {
    store.push({
      updatedBy: ADMIN.userId,
      capability: "text",
      provider: "anthropic",
      model: "claude-sonnet-5-5",
      credentialSource: "user",
      encryptedApiKey: { iv: "AAAA", tag: "AAAA", ciphertext: "AAAA", keyId: "derived:JWT_SECRET" },
    });
    await expect(resolveTextLLM()).rejects.toMatchObject({ code: "missing_credentials" });
    expect(mocks.openaiText).not.toHaveBeenCalled();
  });

  it("reports a missing server key for an env-sourced config", async () => {
    await saveLLMConfig(ADMIN, "text", { provider: "anthropic", model: "claude-sonnet-5-5", credentialSource: "env" });
    vi.stubEnv("ANTHROPIC_API_KEY", "");
    await expect(resolveTextLLM()).rejects.toMatchObject({ code: "missing_credentials" });
  });
});
