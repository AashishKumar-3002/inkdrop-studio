import { createCipheriv, createDecipheriv, randomBytes, createHash } from "crypto";

/**
 * Symmetric encryption for provider API keys at rest.
 *
 * Users paste their own Anthropic/OpenAI/OpenRouter/NVIDIA keys into
 * Settings. Those are credentials belonging to someone else, so they must
 * not sit in the database in plaintext where a backup dump or a read-only
 * SQL injection would expose them.
 *
 * Format: `v1:<iv>:<authTag>:<ciphertext>`, all base64url. AES-256-GCM, so
 * ciphertext is authenticated — tampering fails the tag check rather than
 * silently decrypting to garbage.
 */

const PREFIX = "v1";
const ALGORITHM = "aes-256-gcm";
const IV_LENGTH = 12;

function getKey(): Buffer {
  const raw = process.env.ENCRYPTION_KEY;
  if (!raw) {
    throw new Error(
      "ENCRYPTION_KEY is not set. Generate one with `openssl rand -hex 32` and add it to your environment."
    );
  }
  // A 64-char hex string is used directly as 32 raw bytes; anything else is
  // hashed to 32 bytes so a passphrase also works, just less ideally.
  if (/^[0-9a-f]{64}$/i.test(raw)) return Buffer.from(raw, "hex");
  return createHash("sha256").update(raw).digest();
}

export function encryptSecret(plaintext: string): string {
  if (!plaintext) return "";
  const iv = randomBytes(IV_LENGTH);
  const cipher = createCipheriv(ALGORITHM, getKey(), iv);
  const ciphertext = Buffer.concat([cipher.update(plaintext, "utf8"), cipher.final()]);
  const authTag = cipher.getAuthTag();
  return [
    PREFIX,
    iv.toString("base64url"),
    authTag.toString("base64url"),
    ciphertext.toString("base64url"),
  ].join(":");
}

export function decryptSecret(stored: string): string {
  if (!stored) return "";
  // Values written before encryption existed (or imported from a v1
  // prototype export) are plaintext — pass them through so nothing breaks,
  // and they get re-encrypted the next time the user saves.
  if (!stored.startsWith(`${PREFIX}:`)) return stored;

  const [, ivPart, tagPart, ctPart] = stored.split(":");
  if (!ivPart || !tagPart || !ctPart) return "";
  try {
    const decipher = createDecipheriv(
      ALGORITHM,
      getKey(),
      Buffer.from(ivPart, "base64url")
    );
    decipher.setAuthTag(Buffer.from(tagPart, "base64url"));
    return Buffer.concat([
      decipher.update(Buffer.from(ctPart, "base64url")),
      decipher.final(),
    ]).toString("utf8");
  } catch {
    // Wrong key or tampered payload. Treat as "no key configured" rather
    // than crashing the request — the user can re-enter it in Settings.
    return "";
  }
}

/** True when the value is a non-empty secret (encrypted or plaintext). */
export function hasSecret(stored: string | undefined | null): boolean {
  return Boolean(stored && stored.length > 0);
}

/**
 * What the client is allowed to see: whether a key is set, never the key.
 * The UI renders this as a "key saved" state with a masked placeholder.
 */
export function maskSecret(stored: string | undefined | null): string {
  return hasSecret(stored) ? "••••••••" : "";
}
