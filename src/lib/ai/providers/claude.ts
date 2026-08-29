import Anthropic from "@anthropic-ai/sdk";
import { AIProvider, GenerateChapterRequest } from "../types";

function parseDataUrl(dataUrl: string): { mediaType: string; data: string } | null {
  const match = /^data:([^;]+);base64,(.*)$/.exec(dataUrl);
  if (!match) return null;
  return { mediaType: match[1], data: match[2] };
}

export const claudeProvider: AIProvider = {
  id: "anthropic",
  label: "Claude (Anthropic)",
  defaultModel: "claude-sonnet-4-5-20250929",
  models: [
    { id: "claude-sonnet-4-5-20250929", label: "Claude Sonnet 4.5" },
    { id: "claude-opus-4-1-20250805", label: "Claude Opus 4.1" },
    { id: "claude-3-5-haiku-20241022", label: "Claude Haiku 3.5" },
  ],
  async generateChapter({
    apiKey,
    model,
    systemPrompt,
    userPrompt,
    imageDataUrl,
    onChunk,
  }: GenerateChapterRequest): Promise<string> {
    const client = new Anthropic({ apiKey });
    let full = "";

    const image = imageDataUrl ? parseDataUrl(imageDataUrl) : null;
    const content: Anthropic.MessageParam["content"] = image
      ? [
          {
            type: "image",
            source: {
              type: "base64",
              media_type: image.mediaType as
                | "image/png"
                | "image/jpeg"
                | "image/gif"
                | "image/webp",
              data: image.data,
            },
          },
          { type: "text", text: userPrompt },
        ]
      : userPrompt;

    const stream = client.messages.stream({
      model,
      max_tokens: 8000,
      system: systemPrompt,
      messages: [{ role: "user", content }],
    });
    stream.on("text", (text) => {
      full += text;
      onChunk(text);
    });
    await stream.finalMessage();
    return full;
  },
};
