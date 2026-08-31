import { beforeEach, describe, expect, it } from "vitest";
import {
  PROVIDERS,
  envVarFor,
  getProvider,
  modelSupportsVision,
  providerCatalogue,
  resolveApiKey,
} from "@/lib/ai/providers";
import { encryptSecret } from "@/lib/crypto";
import { AI_PROVIDER_IDS } from "@/lib/types";

beforeEach(() => {
  process.env.ENCRYPTION_KEY = "c".repeat(64);
  for (const id of AI_PROVIDER_IDS) delete process.env[envVarFor(id)];
});

describe("provider registry", () => {
  it("registers every declared provider id, including the new ones", () => {
    expect(Object.keys(PROVIDERS).sort()).toEqual(
      ["anthropic", "nvidia", "openai", "openrouter"].sort()
    );
  });

  it("gives every provider a default model that exists in its own list", () => {
    for (const provider of Object.values(PROVIDERS)) {
      const ids = provider.models.map((m) => m.id);
      expect(ids, `${provider.id} default model`).toContain(provider.defaultModel);
    }
  });

  it("exposes a serializable catalogue for the settings UI", () => {
    const catalogue = providerCatalogue();
    expect(catalogue).toHaveLength(4);
    for (const entry of catalogue) {
      expect(entry.label).toBeTruthy();
      expect(entry.envVar).toMatch(/API_KEY$/);
      expect(entry.models.length).toBeGreaterThan(0);
    }
  });

  it("falls back to a known provider for an unrecognised id", () => {
    // @ts-expect-error deliberately passing an invalid id
    expect(getProvider("nope")).toBe(PROVIDERS.anthropic);
  });
});

describe("resolveApiKey", () => {
  it("prefers the project's own encrypted key", () => {
    process.env.OPENROUTER_API_KEY = "env-key";
    const stored = { openrouter: encryptSecret("project-key") };
    expect(resolveApiKey("openrouter", stored)).toBe("project-key");
  });

  it("falls back to the provider's env var", () => {
    process.env.NVIDIA_API_KEY = "nvapi-from-env";
    expect(resolveApiKey("nvidia", {})).toBe("nvapi-from-env");
  });

  it("returns undefined when neither is configured", () => {
    expect(resolveApiKey("openai", {})).toBeUndefined();
  });

  it("does not leak one provider's key to another", () => {
    const stored = { anthropic: encryptSecret("sk-ant-key") };
    expect(resolveApiKey("openai", stored)).toBeUndefined();
  });

  it("falls back to env when a stored key can't be decrypted", () => {
    process.env.OPENAI_API_KEY = "env-key";
    // Ciphertext written under a different key.
    process.env.ENCRYPTION_KEY = "d".repeat(64);
    const stored = { openai: encryptSecret("old") };
    process.env.ENCRYPTION_KEY = "c".repeat(64);
    expect(resolveApiKey("openai", stored)).toBe("env-key");
  });
});

describe("modelSupportsVision", () => {
  it("knows which catalogued models can see images", () => {
    expect(modelSupportsVision("openai", "gpt-4.1")).toBe(true);
    expect(modelSupportsVision("nvidia", "meta/llama-3.2-90b-vision-instruct")).toBe(true);
    expect(modelSupportsVision("nvidia", "deepseek-ai/deepseek-r1")).toBe(false);
  });

  it("gives unknown (user-typed) model ids the benefit of the doubt", () => {
    expect(modelSupportsVision("openrouter", "some/brand-new-model")).toBe(true);
  });
});
