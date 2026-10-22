import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import crypto from "crypto";
import { SecretDecryptionError, decryptSecret, encryptSecret, keyHint } from "@/lib/ai/llm/secret-box";

beforeEach(() => {
  vi.stubEnv("LLM_CREDENTIALS_KEY", "");
  vi.stubEnv("JWT_SECRET", "test-jwt-secret");
});
afterEach(() => vi.unstubAllEnvs());

describe("secret box", () => {
  it("round-trips and never stores plaintext", () => {
    const enc = encryptSecret("sk-ant-very-secret");
    expect(JSON.stringify(enc)).not.toContain("sk-ant-very-secret");
    expect(decryptSecret(enc)).toBe("sk-ant-very-secret");
  });

  it("uses a fresh IV per encryption", () => {
    expect(encryptSecret("same").ciphertext).not.toBe(encryptSecret("same").ciphertext);
  });

  it("detects tampering", () => {
    const enc = encryptSecret("sk-test");
    const flipped = Buffer.from(enc.ciphertext, "base64");
    flipped[0] ^= 0xff;
    expect(() => decryptSecret({ ...enc, ciphertext: flipped.toString("base64") })).toThrow(SecretDecryptionError);
  });

  it("prefers LLM_CREDENTIALS_KEY and refuses blobs from another key source", () => {
    const derived = encryptSecret("sk-test");
    vi.stubEnv("LLM_CREDENTIALS_KEY", crypto.randomBytes(32).toString("base64"));
    const explicit = encryptSecret("sk-test");
    expect(explicit.keyId).toBe("env:LLM_CREDENTIALS_KEY");
    expect(decryptSecret(explicit)).toBe("sk-test");
    expect(() => decryptSecret(derived)).toThrow(SecretDecryptionError);
  });

  it("only reveals the last four characters in hints", () => {
    expect(keyHint("sk-abcdefghijklmnop")).toBe("…mnop");
  });
});
