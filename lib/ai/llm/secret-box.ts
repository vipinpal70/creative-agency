import crypto from "crypto";

/*
 * AES-256-GCM encryption for stored provider API keys. Server-only.
 *
 * Key source:
 *   - LLM_CREDENTIALS_KEY (preferred): 32 bytes as base64 or 64 hex chars.
 *   - Otherwise a key derived from JWT_SECRET, so existing deployments work
 *     without a new env var. Set LLM_CREDENTIALS_KEY in production so that
 *     rotating JWT_SECRET doesn't make saved credentials undecryptable.
 *
 * `keyId` records which source encrypted a value, so a later switch to
 * LLM_CREDENTIALS_KEY surfaces as a clear "re-enter your key" error instead
 * of silently failing to decrypt.
 */

export interface EncryptedSecret {
  iv: string;
  tag: string;
  ciphertext: string;
  keyId: string;
}

function resolveKey(): { key: Buffer; keyId: string } {
  const explicit = process.env.LLM_CREDENTIALS_KEY?.trim();
  if (explicit) {
    const key = /^[0-9a-f]{64}$/i.test(explicit)
      ? Buffer.from(explicit, "hex")
      : Buffer.from(explicit, "base64");
    if (key.length !== 32) {
      throw new Error("LLM_CREDENTIALS_KEY must be 32 bytes (base64 or 64 hex chars).");
    }
    return { key, keyId: "env:LLM_CREDENTIALS_KEY" };
  }

  const jwtSecret = process.env.JWT_SECRET;
  if (!jwtSecret) {
    throw new Error("No credential encryption key configured (set LLM_CREDENTIALS_KEY).");
  }
  const key = crypto.scryptSync(jwtSecret, "creativeos-llm-credentials-v1", 32);
  return { key, keyId: "derived:JWT_SECRET" };
}

export function encryptSecret(plaintext: string): EncryptedSecret {
  const { key, keyId } = resolveKey();
  const iv = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv("aes-256-gcm", key, iv);
  const ciphertext = Buffer.concat([cipher.update(plaintext, "utf8"), cipher.final()]);
  return {
    iv: iv.toString("base64"),
    tag: cipher.getAuthTag().toString("base64"),
    ciphertext: ciphertext.toString("base64"),
    keyId,
  };
}

export class SecretDecryptionError extends Error {
  constructor() {
    super("The saved API key could not be decrypted. An admin needs to re-enter it in AI Settings.");
    this.name = "SecretDecryptionError";
  }
}

export function decryptSecret(secret: EncryptedSecret): string {
  const { key, keyId } = resolveKey();
  if (secret.keyId && secret.keyId !== keyId) throw new SecretDecryptionError();
  try {
    const decipher = crypto.createDecipheriv("aes-256-gcm", key, Buffer.from(secret.iv, "base64"));
    decipher.setAuthTag(Buffer.from(secret.tag, "base64"));
    return Buffer.concat([
      decipher.update(Buffer.from(secret.ciphertext, "base64")),
      decipher.final(),
    ]).toString("utf8");
  } catch {
    throw new SecretDecryptionError();
  }
}

/** Last 4 chars only — safe to show in the UI to identify which key is saved. */
export function keyHint(apiKey: string): string {
  return apiKey.length > 8 ? `…${apiKey.slice(-4)}` : "…";
}
