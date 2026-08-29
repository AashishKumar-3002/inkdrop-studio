// Core data model for the Inkdrop Studio app.

export type AnswerValue = {
  /** Selected option ids (chips). Empty array if user only wrote custom text. */
  selected: string[];
  /** Free-text "write your own" response. */
  custom: string;
};

export type AnswerMap = Record<string, AnswerValue>;

export interface StoryBibleSection {
  /** Raw answers keyed by question id, from onboarding + deep-dive. */
  answers: AnswerMap;
  /** Freeform notes the user can add anytime for this section. */
  notes: string;
}

export const SECTION_IDS = [
  "feel",
  "philosophy",
  "protagonist",
  "relationships",
  "plot",
  "pacing",
  "world",
  "voice",
  "restraint",
  "structure",
] as const;

export type SectionId = (typeof SECTION_IDS)[number];

export type StoryBible = {
  [K in SectionId]: StoryBibleSection;
};

export function emptySection(): StoryBibleSection {
  return { answers: {}, notes: "" };
}

export function emptyStoryBible(): StoryBible {
  const bible = {} as StoryBible;
  for (const id of SECTION_IDS) bible[id] = emptySection();
  return bible;
}

export type ChapterStatus = "idea" | "generating" | "drafted" | "final";

export interface Chapter {
  id: string;
  index: number;
  title: string;
  /** The user's own idea for what must happen in this chapter. */
  idea: string;
  /** Generated / hand-written prose. */
  content: string;
  /** Short auto- or user-written summary used as compressed context for later chapters. */
  summary: string;
  status: ChapterStatus;
  wordCount: number;
  /** When true, idea/content/title are protected from edits and regeneration. */
  locked: boolean;
  /** How the author intends to produce this chapter — purely a UI hint. */
  mode: "ai" | "manual";
  createdAt: string;
  updatedAt: string;
}

export type AIProviderId = "anthropic" | "openai";

export interface AISettings {
  provider: AIProviderId;
  model: string;
  /** Stored locally in the project file for this prototype. Falls back to env vars if empty. */
  apiKeys: Partial<Record<AIProviderId, string>>;
  /** How many previous chapters to include in full (rest are summarized). */
  fullContextWindow: number;
}

export function defaultAISettings(): AISettings {
  return {
    provider: "anthropic",
    model: "claude-sonnet-4-5-20250929",
    apiKeys: {},
    fullContextWindow: 2,
  };
}

export type ImageProviderId = "openai";

export interface ImageSettings {
  provider: ImageProviderId;
  model: string;
  apiKey: string;
}

export function defaultImageSettings(): ImageSettings {
  return {
    provider: "openai",
    model: "gpt-image-1",
    apiKey: "",
  };
}

export interface BookMeta {
  title: string;
  subtitle: string;
  author: string;
  /** Data URL (base64) of the chosen cover image. */
  coverImageDataUrl: string;
}

export function defaultBookMeta(): BookMeta {
  return { title: "", subtitle: "", author: "", coverImageDataUrl: "" };
}

export interface RollingSummaryEntry {
  chapterIndex: number;
  chapterTitle: string;
  summary: string;
  createdAt: string;
}

export interface RollingSummary {
  enabled: boolean;
  entries: RollingSummaryEntry[];
}

export function defaultRollingSummary(): RollingSummary {
  return { enabled: true, entries: [] };
}

export interface StoryboardNote {
  id: string;
  x: number;
  y: number;
  w: number;
  h: number;
  text: string;
  color: string;
}

export interface StoryboardStroke {
  id: string;
  points: { x: number; y: number }[];
  color: string;
  width: number;
}

export interface StoryboardChatMessage {
  role: "user" | "assistant";
  content: string;
  createdAt: string;
}

export interface Storyboard {
  notes: StoryboardNote[];
  strokes: StoryboardStroke[];
  chat: StoryboardChatMessage[];
}

export function emptyStoryboard(): Storyboard {
  return { notes: [], strokes: [], chat: [] };
}

export interface Project {
  id: string;
  /** Internal / working project name (asked first, at creation). */
  name: string;
  createdAt: string;
  updatedAt: string;
  onboardingComplete: boolean;
  storyBible: StoryBible;
  chapters: Chapter[];
  aiSettings: AISettings;
  imageSettings: ImageSettings;
  book: BookMeta;
  rollingSummary: RollingSummary;
  storyboard: Storyboard;
}
