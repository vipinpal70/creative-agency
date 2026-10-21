import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  validateAnthropic: vi.fn(),
  validateOpenAI: vi.fn(),
}));

vi.mock("@/lib/db", () => ({ connectDB: vi.fn(async () => undefined) }));
vi.mock("@/lib/models/ai/ai-provider-config", async () => {
  const { createFakeConfigModel } = await import("./fake-config-model");
  return { AIProviderConfig: createFakeConfigModel() };
});
vi.mock("@/lib/ai/llm/registry", () => ({
  VALIDATORS: {
    anthropic: { validate: mocks.validateAnthropic },
    openai: { validate: mocks.validateOpenAI },
  },
  TEXT_ADAPTERS: {},
  IMAGE_ADAPTERS: {},
}));

import type { FakeDoc } from "./fake-config-model";
import { AIProviderConfig } from "@/lib/models/ai/ai-provider-config";
import {
  canManageLLMSettings,
  deleteLLMConfig,
  getLLMSettings,
  saveLLMConfig,
  testLLMConfig,
} from "@/lib/ai/llm/config-service";
import { LLMError } from "@/lib/ai/llm/types";

const store = (AIProviderConfig as unknown as { docs: FakeDoc[] }).docs;

const ADMIN = { userId: "64b7f0000000000000000001", role: "admin" };
const OTHER_ADMIN = { userId: "64b7f0000000000000000003", role: "admin" };
const MEMBER = { userId: "64b7f0000000000000000002", role: "member" };

beforeEach(() => {
  store.length = 0;
  mocks.validateAnthropic.mockReset().mockResolvedValue(undefined);
  mocks.validateOpenAI.mockReset().mockResolvedValue(undefined);
  vi.stubEnv("JWT_SECRET", "test-jwt-secret");
  vi.stubEnv("LLM_CREDENTIALS_KEY", "");
  vi.stubEnv("ANTHROPIC_API_KEY", "sk-ant-server");
  vi.stubEnv("OPENAI_API_KEY", "sk-openai-server");
  vi.stubEnv("OPEN_API_KEY", "");
  vi.stubEnv("AI_OPENAI_MODEL", "");
  vi.stubEnv("AI_OPENAI_IMAGE_MODEL", "");
});
afterEach(() => vi.unstubAllEnvs());

describe("configuration persistence", () => {
  it("saves a key encrypted and never returns it", async () => {
    const config = await saveLLMConfig(ADMIN, "text", {
      provider: "anthropic",
      model: "claude-sonnet-5-5",
      apiKey: "sk-ant-admin-key",
    });

    expect(mocks.validateAnthropic).toHaveBeenCalledWith("sk-ant-admin-key", "claude-sonnet-5-5");
    expect(config).toMatchObject({ provider: "anthropic", model: "claude-sonnet-5-5", credentialSource: "user", apiKeyHint: "…-key" });
    expect(JSON.stringify(config)).not.toContain("sk-ant-admin-key");

    expect(store).toHaveLength(1);
    expect(JSON.stringify(store[0])).not.toContain("sk-ant-admin-key");
    expect(store[0].encryptedApiKey.ciphertext).toBeTruthy();
    expect(String(store[0].updatedBy)).toBe(ADMIN.userId);

    const settings = await getLLMSettings(ADMIN);
    expect(JSON.stringify(settings)).not.toContain("ciphertext");
    expect(settings.effective.text).toMatchObject({ provider: "anthropic", source: "user", ready: true });
  });

  it("shows OpenAI defaults for both capabilities before anything is saved", async () => {
    const settings = await getLLMSettings(ADMIN);
    expect(settings.text).toBeNull();
    expect(settings.image).toBeNull();
    expect(settings.effective.text).toMatchObject({ provider: "openai", model: "gpt-4.1", source: "default", ready: true });
    expect(settings.effective.image).toMatchObject({ provider: "openai", model: "gpt-image-1", source: "default", ready: true });
  });

  it("stores text and image configs independently", async () => {
    await saveLLMConfig(ADMIN, "text", { provider: "anthropic", model: "claude-sonnet-5-5", credentialSource: "env" });
    await saveLLMConfig(ADMIN, "image", { provider: "openai", model: "gpt-image-1", credentialSource: "env", options: { size: "1536x1024" } });

    const settings = await getLLMSettings(ADMIN);
    expect(settings.text?.provider).toBe("anthropic");
    expect(settings.image).toMatchObject({ provider: "openai", model: "gpt-image-1", options: { size: "1536x1024" } });
  });

  it("keeps one workspace document per capability, whichever admin saves", async () => {
    await saveLLMConfig(ADMIN, "text", { provider: "openai", model: "gpt-4.1", apiKey: "sk-first" });
    await saveLLMConfig(OTHER_ADMIN, "text", { provider: "openai", model: "gpt-4o", credentialSource: "user" });

    expect(store).toHaveLength(1);
    expect(store[0].model).toBe("gpt-4o");
    expect(String(store[0].updatedBy)).toBe(OTHER_ADMIN.userId);
    // The second admin kept the workspace key without re-entering it.
    expect(mocks.validateOpenAI).toHaveBeenLastCalledWith("sk-first", "gpt-4o");
  });

  it("never reuses a stored key for a different provider", async () => {
    await saveLLMConfig(ADMIN, "text", { provider: "openai", model: "gpt-4.1", apiKey: "sk-openai-saved" });
    await expect(
      saveLLMConfig(ADMIN, "text", { provider: "anthropic", model: "claude-sonnet-5-5", credentialSource: "user" })
    ).rejects.toMatchObject({ code: "missing_credentials" });
    expect(mocks.validateAnthropic).not.toHaveBeenCalled();
  });

  it("switching to the server key removes the stored ciphertext", async () => {
    await saveLLMConfig(ADMIN, "text", { provider: "openai", model: "gpt-4.1", apiKey: "sk-saved" });
    await saveLLMConfig(ADMIN, "text", { provider: "openai", model: "gpt-4.1", credentialSource: "env" });
    expect(store[0].encryptedApiKey).toBeUndefined();
    expect(store[0].credentialSource).toBe("env");
    expect(mocks.validateOpenAI).toHaveBeenLastCalledWith("sk-openai-server", "gpt-4.1");
  });

  it("delete reverts to the OpenAI defaults", async () => {
    await saveLLMConfig(ADMIN, "text", { provider: "anthropic", model: "claude-sonnet-5-5", credentialSource: "env" });
    await deleteLLMConfig(ADMIN, "text");
    const settings = await getLLMSettings(ADMIN);
    expect(settings.text).toBeNull();
    expect(settings.effective.text).toMatchObject({ provider: "openai", source: "default" });
  });
});

describe("credential validation", () => {
  it("does not save when the provider rejects the key", async () => {
    mocks.validateOpenAI.mockRejectedValue(new LLMError("invalid_credentials", "OpenAI rejected the API key.", "openai"));
    await expect(
      saveLLMConfig(ADMIN, "text", { provider: "openai", model: "gpt-4.1", apiKey: "sk-bad" })
    ).rejects.toMatchObject({ code: "invalid_credentials", status: 422 });
    expect(store).toHaveLength(0);
  });

  it("requires a key when the server has none for that provider", async () => {
    vi.stubEnv("OPENAI_API_KEY", "");
    await expect(
      saveLLMConfig(ADMIN, "image", { provider: "openai", model: "gpt-image-1", credentialSource: "env" })
    ).rejects.toMatchObject({ code: "missing_credentials" });
  });

  it("rejects keys that are obviously malformed without calling the provider", async () => {
    await expect(
      testLLMConfig(ADMIN, "text", { provider: "openai", model: "gpt-4.1", apiKey: "sk with spaces" })
    ).rejects.toMatchObject({ code: "invalid_credentials" });
    expect(mocks.validateOpenAI).not.toHaveBeenCalled();
  });

  it("test validates without persisting", async () => {
    await testLLMConfig(ADMIN, "text", { provider: "anthropic", model: "claude-opus-5-5", apiKey: "sk-ant-test" });
    expect(mocks.validateAnthropic).toHaveBeenCalledWith("sk-ant-test", "claude-opus-5-5");
    expect(store).toHaveLength(0);
  });
});

describe("unsupported image models", () => {
  it("refuses to save Claude as the image provider and returns the warning", async () => {
    const err = await saveLLMConfig(ADMIN, "image", {
      provider: "anthropic",
      model: "claude-sonnet-5-5",
      apiKey: "sk-ant-admin",
    }).catch((e) => e);

    expect(err).toBeInstanceOf(LLMError);
    expect(err.code).toBe("unsupported_capability");
    expect(err.warning?.title).toBe("Image Generation Compatibility Warning");
    expect(mocks.validateAnthropic).not.toHaveBeenCalled();
    expect(store).toHaveLength(0);
  });

  it("refuses an OpenAI text model as an image model", async () => {
    await expect(
      saveLLMConfig(ADMIN, "image", { provider: "openai", model: "gpt-4o", credentialSource: "env" })
    ).rejects.toMatchObject({ code: "unsupported_capability" });
  });

  it("falls back to the model's default size for an unsupported size", async () => {
    const config = await saveLLMConfig(ADMIN, "image", {
      provider: "openai",
      model: "gpt-image-1-mini",
      credentialSource: "env",
      options: { size: "999x999" },
    });
    expect(config.options.size).toBe("1024x1024");
  });
});

describe("access control (admin only)", () => {
  it("only the admin role may manage settings", () => {
    expect(canManageLLMSettings({ role: "admin" })).toBe(true);
    for (const role of ["member", "sub-user", "client", undefined]) {
      expect(canManageLLMSettings({ role })).toBe(false);
    }
    expect(canManageLLMSettings(null)).toBe(false);
  });

  it("non-admins cannot read the configuration", async () => {
    await expect(getLLMSettings(MEMBER)).rejects.toMatchObject({ code: "forbidden", status: 403 });
    await expect(getLLMSettings({ ...MEMBER, role: "client" })).rejects.toMatchObject({ code: "forbidden" });
  });

  it("non-admins cannot test, save or reset, and the provider is never called", async () => {
    const input = { provider: "openai", model: "gpt-4.1", apiKey: "sk-member" };
    await expect(testLLMConfig(MEMBER, "text", input)).rejects.toMatchObject({ code: "forbidden" });
    await expect(saveLLMConfig(MEMBER, "text", input)).rejects.toMatchObject({ code: "forbidden" });

    await saveLLMConfig(ADMIN, "text", { provider: "openai", model: "gpt-4.1", credentialSource: "env" });
    await expect(deleteLLMConfig(MEMBER, "text")).rejects.toMatchObject({ code: "forbidden" });

    expect(store).toHaveLength(1);
    expect(mocks.validateOpenAI).toHaveBeenCalledTimes(1); // the admin's save only
  });

  it("rejects malformed admin sessions", async () => {
    await expect(getLLMSettings({ userId: "not-an-id", role: "admin" })).rejects.toBeInstanceOf(LLMError);
  });
});
