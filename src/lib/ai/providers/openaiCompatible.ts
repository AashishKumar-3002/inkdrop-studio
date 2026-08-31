import OpenAI from "openai";
import type { AIProviderId } from "@/lib/types";
import type { AIProvider, GenerateChapterRequest } from "../types";

export interface OpenAICompatibleConfig {
  id: AIProviderId;
  label: string;
  /** Omit for OpenAI itself, which uses the SDK's default endpoint. */
  baseURL?: string;
  defaultModel: string;
  models: { id: string; label: string; vision?: boolean }[];
  /** Extra headers some gateways want (e.g. OpenRouter's attribution pair). */
  defaultHeaders?: Record<string, string>;
  docsUrl?: string;
  keyHint?: string;
}

/**
 * Builds an AIProvider for any service that speaks the OpenAI Chat
 * Completions protocol. OpenAI, OpenRouter and NVIDIA NIM are all just a
 * different base URL and model list over the same wire format, so they
 * share one streaming implementation rather than three near-copies that
 * drift apart.
 */
export function createOpenAICompatibleProvider(
  config: OpenAICompatibleConfig
): AIProvider {
  return {
    id: config.id,
    label: config.label,
    defaultModel: config.defaultModel,
    models: config.models,
    docsUrl: config.docsUrl,
    keyHint: config.keyHint,

    async generateChapter({
      apiKey,
      model,
      systemPrompt,
      userPrompt,
      imageDataUrl,
      maxTokens,
      signal,
      onChunk,
    }: GenerateChapterRequest): Promise<string> {
      const client = new OpenAI({
        apiKey,
        baseURL: config.baseURL,
        defaultHeaders: config.defaultHeaders,
        maxRetries: 2,
      });

      const userContent: OpenAI.Chat.ChatCompletionContentPart[] = imageDataUrl
        ? [
            { type: "image_url", image_url: { url: imageDataUrl } },
            { type: "text", text: userPrompt },
          ]
        : [{ type: "text", text: userPrompt }];

      const stream = await client.chat.completions.create(
        {
          model,
          stream: true,
          max_tokens: maxTokens ?? 8000,
          messages: [
            { role: "system", content: systemPrompt },
            { role: "user", content: userContent },
          ],
        },
        { signal }
      );

      let full = "";
      for await (const part of stream) {
        const delta = part.choices?.[0]?.delta?.content ?? "";
        if (delta) {
          full += delta;
          onChunk(delta);
        }
      }
      return full;
    },
  };
}
