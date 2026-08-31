/**
 * Pure merge logic for project settings.
 *
 * Kept out of the repository module deliberately: this is where API keys get
 * encrypted and where transport-only fields get discarded, which is worth
 * being able to unit-test without a database anywhere near it.
 */
import { encryptSecret } from "@/lib/crypto";
import type { AISettings, ImageSettings } from "@/lib/types";

/** The settings form's shape: the stored fields, plus which key to save. */
export type AISettingsPatch = Partial<AISettings> & {
  apiKey?: string;
  apiKeyProvider?: string;
};

/**
 * Merges an AI-settings patch, encrypting a newly supplied API key and
 * keeping the existing one when the client echoes back the masked
 * placeholder (i.e. the user didn't retype their key).
 */
export function mergeAISettings(
  current: AISettings,
  patch: AISettingsPatch
): AISettings {
  // `apiKey` and `apiKeyProvider` are transport-only — they say *which* key
  // to encrypt into `apiKeys`. They must be destructured off before the
  // spread below, or the plaintext key ends up written into the stored
  // document and echoed straight back to the browser.
  const { apiKey, apiKeyProvider, ...rest } = patch;

  const next: AISettings = {
    ...current,
    ...rest,
    apiKeys: { ...current.apiKeys },
  };

  if (typeof apiKey === "string") {
    const providerId = (apiKeyProvider || rest.provider || current.provider) as
      keyof AISettings["apiKeys"];
    if (apiKey === "") {
      delete next.apiKeys[providerId];
    } else if (!apiKey.startsWith("•")) {
      // Never store a masked placeholder the client echoed back.
      next.apiKeys[providerId] = encryptSecret(apiKey);
    }
  }
  return next;
}

export function mergeImageSettings(
  current: ImageSettings,
  patch: Partial<ImageSettings>
): ImageSettings {
  const next: ImageSettings = { ...current, ...patch };
  if (typeof patch.apiKey === "string") {
    if (patch.apiKey === "") next.apiKey = "";
    else if (patch.apiKey.startsWith("•")) next.apiKey = current.apiKey;
    else next.apiKey = encryptSecret(patch.apiKey);
  }
  return next;
}
