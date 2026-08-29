import { AIProviderId } from "../types";

export interface GenerateChapterRequest {
  apiKey: string;
  model: string;
  systemPrompt: string;
  userPrompt: string;
  /** Optional image (data: URL) attached to the user turn — used for the storyboard agent to "see" a sketch. */
  imageDataUrl?: string;
  /** Called with each new text chunk as it streams in. */
  onChunk: (chunk: string) => void;
}

export interface AIProvider {
  id: AIProviderId;
  label: string;
  defaultModel: string;
  models: { id: string; label: string }[];
  /** Streams the generated chapter text via onChunk, resolves with full text. */
  generateChapter(req: GenerateChapterRequest): Promise<string>;
}
