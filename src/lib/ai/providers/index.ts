import { AIProviderId } from "../../types";
import { decryptSecret } from "../../crypto";
import { AIProvider } from "../types";
import { claudeProvider } from "./claude";
import { openaiProvider } from "./openai";
import { openrouterProvider } from "./openrouter";
import { nvidiaProvider } from "./nvidia";
import { claudeSubscriptionProvider, isDesktopRuntime } from "./claudeSubscription";

export const PROVIDERS: Record<AIProviderId, AIProvider> = {
  anthropic: claudeProvider,
  openai: openaiProvider,
  openrouter: openrouterProvider,
  nvidia: nvidiaProvider,
  "claude-subscription": claudeSubscriptionProvider,
};

export function getProvider(id: AIProviderId): AIProvider {
  return PROVIDERS[id] ?? claudeProvider;
}

/** Environment variable consulted when a project has no key of its own. */
const ENV_VAR_BY_PROVIDER: Record<AIProviderId, string> = {
  anthropic: "ANTHROPIC_API_KEY",
  openai: "OPENAI_API_KEY",
  openrouter: "OPENROUTER_API_KEY",
  nvidia: "NVIDIA_API_KEY",
  // Signs in with the user's Claude account instead of a key.
  "claude-subscription": "",
};

export function envVarFor(providerId: AIProviderId): string {
  return ENV_VAR_BY_PROVIDER[providerId];
}

/**
 * Resolves the usable (decrypted) API key for a provider: the project's own
 * stored key first, then the instance-wide env var. Returns undefined when
 * neither is set, which callers turn into a friendly 400.
 */
export function resolveApiKey(
  providerId: AIProviderId,
  storedKeys: Partial<Record<AIProviderId, string>> | undefined
): string | undefined {
  // Subscription mode authenticates through the local Claude session, so
  // there is no key to resolve — return a sentinel so callers' "no key
  // configured" guard doesn't reject it.
  if (providerId === "claude-subscription") {
    return isDesktopRuntime() ? "subscription" : undefined;
  }
  const stored = storedKeys?.[providerId];
  if (stored) {
    const decrypted = decryptSecret(stored);
    if (decrypted) return decrypted;
  }
  return process.env[ENV_VAR_BY_PROVIDER[providerId]] || undefined;
}

/** Whether the chosen model can accept an image (the storyboard sketch). */
export function modelSupportsVision(
  providerId: AIProviderId,
  modelId: string
): boolean {
  const provider = getProvider(providerId);
  const model = provider.models.find((m) => m.id === modelId);
  // Unknown model ids (a user typing in their own) are given the benefit of
  // the doubt — the provider will error if it genuinely can't see images.
  return model ? Boolean(model.vision) : true;
}

/** Serializable provider catalogue for the settings UI. */
export function providerCatalogue() {
  return Object.values(PROVIDERS)
    // Subscription mode can't work without a local Claude session, so the
    // web build never offers it.
    .filter((p) => p.id !== "claude-subscription" || isDesktopRuntime())
    .map((p) => ({
    id: p.id,
    label: p.label,
    defaultModel: p.defaultModel,
    models: p.models,
    docsUrl: p.docsUrl,
    keyHint: p.keyHint,
      envVar: ENV_VAR_BY_PROVIDER[p.id],
      /** No API key field in Settings for this one. */
      usesSubscription: p.id === "claude-subscription",
    }));
}
