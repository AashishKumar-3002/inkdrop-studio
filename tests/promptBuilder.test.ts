import { describe, expect, it } from "vitest";
import { buildChapterPrompt } from "@/lib/ai/promptBuilder";
import {
  defaultAISettings,
  defaultBookMeta,
  defaultImageSettings,
  defaultRollingSummary,
  emptyStoryBible,
  emptyStoryboard,
  type Chapter,
  type Project,
} from "@/lib/types";

function chapter(index: number, over: Partial<Chapter> = {}): Chapter {
  return {
    id: `ch-${index}`,
    index,
    title: `Chapter ${index}`,
    idea: "",
    content: `Body of chapter ${index}.`,
    summary: "",
    status: "drafted",
    wordCount: 4,
    locked: false,
    mode: "ai",
    createdAt: "2026-01-01T00:00:00.000Z",
    updatedAt: "2026-01-01T00:00:00.000Z",
    ...over,
  };
}

function project(over: Partial<Project> = {}): Project {
  return {
    id: "p1",
    userId: "u1",
    name: "The Long Dark",
    createdAt: "2026-01-01T00:00:00.000Z",
    updatedAt: "2026-01-01T00:00:00.000Z",
    onboardingComplete: true,
    storyBible: emptyStoryBible(),
    chapters: [],
    aiSettings: defaultAISettings(),
    imageSettings: defaultImageSettings(),
    book: defaultBookMeta(),
    rollingSummary: defaultRollingSummary(),
    storyboard: emptyStoryboard(),
    ...over,
  };
}

describe("buildChapterPrompt", () => {
  it("throws for a chapter that isn't in the project", () => {
    expect(() => buildChapterPrompt(project(), "missing")).toThrow();
  });

  it("says so explicitly when there are no prior chapters", () => {
    const p = project({ chapters: [chapter(1)] });
    expect(buildChapterPrompt(p, "ch-1").user).toContain("first chapter");
  });

  it("includes the author's idea for the chapter", () => {
    const p = project({
      chapters: [chapter(1, { idea: "Mara finds the second letter." })],
    });
    expect(buildChapterPrompt(p, "ch-1").user).toContain(
      "Mara finds the second letter."
    );
  });

  it("never leaks a later chapter into an earlier one's context", () => {
    const p = project({
      chapters: [chapter(1), chapter(2), chapter(3, { content: "SPOILER TEXT" })],
    });
    const { user } = buildChapterPrompt(p, "ch-2");
    expect(user).not.toContain("SPOILER TEXT");
    expect(user).toContain("Body of chapter 1.");
  });

  it("sends only fullContextWindow chapters in full, summarizing the rest", () => {
    const p = project({
      aiSettings: { ...defaultAISettings(), fullContextWindow: 1 },
      chapters: [
        chapter(1, { content: "OLDEST FULL TEXT" }),
        chapter(2, { content: "NEWEST FULL TEXT" }),
        chapter(3),
      ],
      rollingSummary: {
        enabled: true,
        entries: [
          {
            chapterId: "ch-1",
            chapterTitle: "Chapter 1",
            summary: "Mara leaves home.",
            createdAt: "2026-01-01T00:00:00.000Z",
          },
        ],
      },
    });
    const { user } = buildChapterPrompt(p, "ch-3");
    // Chapter 2 is inside the window, so it appears verbatim.
    expect(user).toContain("NEWEST FULL TEXT");
    // Chapter 1 is outside it, so only its rolling summary is sent.
    expect(user).not.toContain("OLDEST FULL TEXT");
    expect(user).toContain("Mara leaves home.");
  });

  it("prefers the rolling summary over a raw content truncation", () => {
    const p = project({
      aiSettings: { ...defaultAISettings(), fullContextWindow: 1 },
      chapters: [
        chapter(1, { content: "x".repeat(2000), summary: "chapter-level summary" }),
        chapter(2),
        chapter(3),
      ],
      rollingSummary: {
        enabled: true,
        entries: [
          {
            chapterId: "ch-1",
            chapterTitle: "Chapter 1",
            summary: "rolling summary wins",
            createdAt: "2026-01-01T00:00:00.000Z",
          },
        ],
      },
    });
    const { user } = buildChapterPrompt(p, "ch-3");
    expect(user).toContain("rolling summary wins");
    expect(user).not.toContain("chapter-level summary");
  });

  it("puts the project name in the system prompt", () => {
    const p = project({ chapters: [chapter(1)] });
    expect(buildChapterPrompt(p, "ch-1").system).toContain("The Long Dark");
  });
});

 it("includes the complete current chapter and revision instructions", () => {
  const source = "Mara opened the letter.\n" + "Unabridged source text. ".repeat(1500);
  const p = project({ chapters: [chapter(1, { content: source, idea: "Improve the pacing." })] });
  const { user } = buildChapterPrompt(p, "ch-1");
  expect(user).toContain(source.trim());
  expect(user).toContain("Improve the pacing.");
  expect(user).toContain("Return the complete revised chapter");
});
 it("writes a new chapter when no current text exists", () => {
  const p = project({ chapters: [chapter(1, { content: "" })] });
  expect(buildChapterPrompt(p, "ch-1").user).not.toContain("Existing chapter to revise");
  expect(buildChapterPrompt(p, "ch-1").user).toContain("Write the complete chapter now");
});
