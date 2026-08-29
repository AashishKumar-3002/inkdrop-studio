import OpenAI from "openai";
import { AIProvider, GenerateChapterRequest } from "../types";

export const openaiProvider: AIProvider = {
  id: "openai",
  label: "OpenAI",
  defaultModel: "gpt-4.1",
  models: [
    { id: "gpt-4.1", label: "GPT-4.1" },
    { id: "gpt-4.1-mini", label: "GPT-4.1 Mini" },
    { id: "o3", label: "o3" },
  ],
  async generateChapter({
    apiKey,
    model,
    systemPrompt,
    userPrompt,
    imageDataUrl,
    onChunk,
  }: GenerateChapterRequest): Promise<string> {
    const client = new OpenAI({ apiKey });
    let full = "";

    const userContent: OpenAI.Chat.ChatCompletionContentPart[] = imageDataUrl
      ? [
          { type: "image_url", image_url: { url: imageDataUrl } },
          { type: "text", text: userPrompt },
        ]
      : [{ type: "text", text: userPrompt }];

    const stream = await client.chat.completions.create({
      model,
      stream: true,
      max_tokens: 8000,
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: userContent },
      ],
    });
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
