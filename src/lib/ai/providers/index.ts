import { AIProviderId } from "../../types";
import { AIProvider } from "../types";
import { claudeProvider } from "./claude";
import { openaiProvider } from "./openai";

export const PROVIDERS: Record<AIProviderId, AIProvider> = {
  anthropic: claudeProvider,
  openai: openaiProvider,
};

export function getProvider(id: AIProviderId): AIProvider {
  return PROVIDERS[id];
}

export function resolveApiKey(
  providerId: AIProviderId,
  storedKeys: Partial<Record<AIProviderId, string>>
): string | undefined {
  const stored = storedKeys?.[providerId];
  if (stored) return stored;
  if (providerId === "anthropic") return process.env.ANTHROPIC_API_KEY;
  if (providerId === "openai") return process.env.OPENAI_API_KEY;
  return undefined;
}
