import { AIProviderId } from "../types";

export interface GenerateChapterRequest {
  apiKey: string;
  model: string;
  systemPrompt: string;
  userPrompt: string;
  /** Optional image (data: URL) attached to the user turn — used by the storyboard agent to "see" a sketch. */
  imageDataUrl?: string;
  /** Upper bound on generated tokens. Defaults to a chapter-sized budget. */
  maxTokens?: number;
  /** Lets a route abort the upstream call when the client disconnects. */
  signal?: AbortSignal;
  /** Called with each new text chunk as it streams in. */
  outputSchema?: Record<string, unknown>;
  onChunk: (chunk: string) => void;
}

export interface ProviderModel {
  id: string;
  label: string;
  /** Whether this model can accept the storyboard sketch as an image. */
  vision?: boolean;
}

export interface AIProvider {
  id: AIProviderId;
  label: string;
  defaultModel: string;
  models: ProviderModel[];
  /** Where a user goes to get an API key for this provider. */
  docsUrl?: string;
  /** Short hint shown under the key field, e.g. the expected key prefix. */
  keyHint?: string;
  /** Streams the generated text via onChunk, resolves with the full text. */
  generateChapter(req: GenerateChapterRequest): Promise<string>;
}
