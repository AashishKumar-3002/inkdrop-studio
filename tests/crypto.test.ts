import { beforeAll, describe, expect, it } from "vitest";
import { decryptSecret, encryptSecret, hasSecret, maskSecret } from "@/lib/crypto";

const KEY_A = "a".repeat(64);
const KEY_B = "b".repeat(64);

beforeAll(() => {
  process.env.ENCRYPTION_KEY = KEY_A;
});

describe("API key encryption", () => {
  it("round-trips a secret", () => {
    const secret = "sk-ant-api03-abcdefghijklmnop";
    expect(decryptSecret(encryptSecret(secret))).toBe(secret);
  });

  it("produces a different ciphertext each time (random IV)", () => {
    const a = encryptSecret("same-input");
    const b = encryptSecret("same-input");
    expect(a).not.toBe(b);
    expect(decryptSecret(a)).toBe(decryptSecret(b));
  });

  it("never stores the plaintext in the ciphertext", () => {
    expect(encryptSecret("sk-super-secret")).not.toContain("sk-super-secret");
  });

  it("returns empty for an empty input", () => {
    expect(encryptSecret("")).toBe("");
    expect(decryptSecret("")).toBe("");
  });

  it("passes through legacy plaintext values unchanged", () => {
    // Values written before encryption existed have no "v1:" prefix.
    expect(decryptSecret("sk-legacy-plaintext")).toBe("sk-legacy-plaintext");
  });

  it("fails closed when the key is wrong rather than returning garbage", () => {
    const encrypted = encryptSecret("sk-secret");
    process.env.ENCRYPTION_KEY = KEY_B;
    expect(decryptSecret(encrypted)).toBe("");
    process.env.ENCRYPTION_KEY = KEY_A;
  });

  it("fails closed when the ciphertext has been tampered with", () => {
    const encrypted = encryptSecret("sk-secret");
    const parts = encrypted.split(":");
    // Flip a character in the ciphertext segment; GCM's auth tag must reject it.
    parts[3] = (parts[3][0] === "A" ? "B" : "A") + parts[3].slice(1);
    expect(decryptSecret(parts.join(":"))).toBe("");
  });

  it("masks without leaking length", () => {
    expect(maskSecret("sk-a-very-long-key-here")).toBe("••••••••");
    expect(maskSecret("")).toBe("");
    expect(hasSecret("x")).toBe(true);
    expect(hasSecret("")).toBe(false);
  });
});
