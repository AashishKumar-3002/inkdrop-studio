import { describe, expect, it } from "vitest";
import { applyPassageChanges, assistantRequestSchema, comparePassages, parseChapterAnalysis } from "@/lib/chapterAssistant";

const report = () => ({ assessment: "A convincing opening.", categories: Object.fromEntries(["engagement", "character", "structure", "prose", "coherence"].map((key, index) => [key, { score: 60 + index * 5, explanation: "Specific editorial reason." }])), strengths: [{ quote: "She waited.", comment: "Builds anticipation." }], improvements: [{ quote: "Then nothing.", issue: "The ending stalls.", suggestion: "Clarify what she risks." }], overall: 100 });
describe("chapter editorial analysis", () => {
  it("computes the mean itself and accepts fenced JSON", () => {
    expect(parseChapterAnalysis("```json\n" + JSON.stringify(report()) + "\n```", "She waited. Then nothing.").overall).toBe(70);
  });
  it("maps harmless typography and whitespace back to the exact chapter excerpt", () => {
    const data = report(); data.strengths[0].quote = "She waited."; data.improvements[0].quote = "Then nothing.";
    expect(parseChapterAnalysis(JSON.stringify(data), "She   waited. Then\nnothing.").strengths[0].quote).toBe("She   waited.");
    expect(parseChapterAnalysis(JSON.stringify(data), "She   waited. Then\nnothing.").improvements[0].quote).toBe("Then\nnothing.");
  });
  it("rejects invented evidence and out-of-range scores", () => {
    expect(() => parseChapterAnalysis(JSON.stringify(report()), "A different chapter.")).toThrow();
    const invalid = report(); invalid.categories.prose.score = 101;
    expect(() => parseChapterAnalysis(JSON.stringify(invalid), "She waited. Then nothing.")).toThrow();
  });
  it("validates scope and author instructions", () => {
    expect(assistantRequestSchema.safeParse({ action: "rewrite", content: "text", instruction: " " }).success).toBe(false);
    expect(assistantRequestSchema.safeParse({ action: "ask", content: "text", instruction: "Why?", selection: { start: 1, end: 9 } }).success).toBe(false);
    expect(assistantRequestSchema.safeParse({ action: "analyze", content: "text", selection: { start: 0, end: 1 } }).success).toBe(false);
    expect(assistantRequestSchema.safeParse({ action: "humanize", content: "text" }).success).toBe(true);
  });
});
describe("reviewed passage edits", () => {
  it.each([
    ["first\n\nsecond\n\nthird", "First!\n\nsecond\n\nThird!"],
    ["", "An insertion.\n"], ["Delete me.\n", ""],
    ["Same\n\nEnd", "Same\n\nNew\n\nEnd"],
    ["🍃 Héllo\r\n\r\nend\n", "🍃 Bonjour\r\n\r\nend\n"],
    ["a\nb\na\nb\n", "b\na\nb\na\n"],
    ["\n\n", "\nMore\n\n"],
    ["a\n".repeat(501), "b\n".repeat(501)],
  ])("reconstructs a complete replacement without losing whitespace", (before, after) => {
    expect(applyPassageChanges(before, after)).toBe(after);
    for (const change of comparePassages(before, after)) expect(before.slice(change.start, change.end)).toBe(change.before);
  });
  it("keeps adjacent rewritten paragraphs individually reviewable", () => {
    expect(comparePassages("One.\n\nTwo.\n\nThree.", "First.\n\nSecond.\n\nThree.")).toHaveLength(2);
    expect(applyPassageChanges("One.\n\nTwo.\n\nThree.", "First.\n\nSecond.\n\nThree.", [1])).toBe("One.\n\nSecond.\n\nThree.");
  });
  it("applies only approved passages and leaves the rest byte-identical", () => {
    const source = "first\n\nuntouched\n\nthird";
    const replacement = "First!\n\nuntouched\n\nThird!";
    expect(comparePassages(source, replacement)).toHaveLength(2);
    expect(applyPassageChanges(source, replacement, [1])).toBe("first\n\nuntouched\n\nThird!");
    expect(applyPassageChanges(source, replacement, [])).toBe(source);
    expect(() => applyPassageChanges(source, replacement, [1, 1])).toThrow();
    expect(() => applyPassageChanges(source, replacement, [99])).toThrow();
  });
});
