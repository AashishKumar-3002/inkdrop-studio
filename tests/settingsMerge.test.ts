import { beforeAll, describe, expect, it } from "vitest";
import { mergeAISettings, mergeImageSettings } from "@/lib/settings";
import { decryptSecret } from "@/lib/crypto";
import { defaultAISettings, defaultImageSettings } from "@/lib/types";

beforeAll(() => {
  process.env.ENCRYPTION_KEY = "e".repeat(64);
});

describe("mergeAISettings", () => {
  it("encrypts a newly supplied key into apiKeys", () => {
    const next = mergeAISettings(defaultAISettings(), {
      apiKey: "sk-or-plaintext",
      apiKeyProvider: "openrouter",
    });
    expect(next.apiKeys.openrouter).toBeTruthy();
    expect(next.apiKeys.openrouter).not.toContain("plaintext");
    expect(decryptSecret(next.apiKeys.openrouter!)).toBe("sk-or-plaintext");
  });

  it("REGRESSION: never writes the transport-only fields into the document", () => {
    // These fields say *which* key to encrypt; spreading them onto the stored
    // settings persisted the plaintext key and echoed it back to the browser.
    const next = mergeAISettings(defaultAISettings(), {
      apiKey: "sk-SUPERSECRET",
      apiKeyProvider: "openai",
    }) as unknown as Record<string, unknown>;
    expect(next.apiKey).toBeUndefined();
    expect(next.apiKeyProvider).toBeUndefined();
    expect(JSON.stringify(next)).not.toContain("SUPERSECRET");
  });

  it("attributes the key to apiKeyProvider, not the active provider", () => {
    const current = { ...defaultAISettings(), provider: "anthropic" as const };
    const next = mergeAISettings(current, {
      apiKey: "nvapi-key",
      apiKeyProvider: "nvidia",
    });
    expect(next.apiKeys.nvidia).toBeTruthy();
    expect(next.apiKeys.anthropic).toBeUndefined();
  });

  it("clears a stored key when given an empty string", () => {
    const current = mergeAISettings(defaultAISettings(), {
      apiKey: "sk-x",
      apiKeyProvider: "openai",
    });
    const cleared = mergeAISettings(current, { apiKey: "", apiKeyProvider: "openai" });
    expect(cleared.apiKeys.openai).toBeUndefined();
  });

  it("keeps the existing key when the client echoes the mask back", () => {
    const current = mergeAISettings(defaultAISettings(), {
      apiKey: "sk-real",
      apiKeyProvider: "openai",
    });
    const next = mergeAISettings(current, {
      apiKey: "••••••••",
      apiKeyProvider: "openai",
    });
    expect(decryptSecret(next.apiKeys.openai!)).toBe("sk-real");
  });

  it("leaves other keys alone when one is updated", () => {
    let s = mergeAISettings(defaultAISettings(), {
      apiKey: "sk-ant",
      apiKeyProvider: "anthropic",
    });
    s = mergeAISettings(s, { apiKey: "sk-oai", apiKeyProvider: "openai" });
    expect(decryptSecret(s.apiKeys.anthropic!)).toBe("sk-ant");
    expect(decryptSecret(s.apiKeys.openai!)).toBe("sk-oai");
  });

  it("still applies ordinary setting changes", () => {
    const next = mergeAISettings(defaultAISettings(), {
      provider: "nvidia",
      model: "meta/llama-3.3-70b-instruct",
      fullContextWindow: 5,
    });
    expect(next.provider).toBe("nvidia");
    expect(next.fullContextWindow).toBe(5);
  });
});

describe("mergeImageSettings", () => {
  it("encrypts the key rather than storing it raw", () => {
    const next = mergeImageSettings(defaultImageSettings(), { apiKey: "sk-img" });
    expect(next.apiKey).not.toBe("sk-img");
    expect(decryptSecret(next.apiKey)).toBe("sk-img");
  });

  it("keeps the existing key when the mask is echoed back", () => {
    const current = mergeImageSettings(defaultImageSettings(), { apiKey: "sk-img" });
    const next = mergeImageSettings(current, { apiKey: "••••••••" });
    expect(decryptSecret(next.apiKey)).toBe("sk-img");
  });

  it("clears on an empty string", () => {
    const current = mergeImageSettings(defaultImageSettings(), { apiKey: "sk-img" });
    expect(mergeImageSettings(current, { apiKey: "" }).apiKey).toBe("");
  });
});
