import { beforeEach, describe, expect, it, vi } from "vitest";
import type { GenerateChapterRequest } from "@/lib/ai/types";
import { defaultAISettings, defaultBookMeta, defaultImageSettings, defaultRollingSummary, emptyStoryBible, emptyStoryboard, type Project } from "@/lib/types";
const mocks = vi.hoisted(() => ({ generate: vi.fn(), resolve: vi.fn(() => "subscription") }));
vi.mock("@/lib/ai/providers", () => ({ getProvider: () => ({ id: "codex-subscription", label: "Codex", defaultModel: "", generateChapter: mocks.generate }), resolveApiKey: mocks.resolve, isSubscriptionProvider: () => true }));
vi.mock("@/lib/apiHelpers", () => ({ ApiProblem: class extends Error { constructor(public status: number, message: string) { super(message); } } }));
import { runChapterAssistant } from "@/lib/ai/chapterAssistant";
function project(locked = false): Project {
  return { id: "p", userId: "u", name: "Test", createdAt: "", updatedAt: "", onboardingComplete: true, aiSettings: defaultAISettings(), book: defaultBookMeta(), imageSettings: defaultImageSettings(), rollingSummary: defaultRollingSummary(), storyBible: emptyStoryBible(), storyboard: emptyStoryboard(), chapters: [{ id: "c", index: 1, title: "Chapter", idea: "", content: "Saved chapter", summary: "", mode: "manual", locked, wordCount: 2, status: "drafted", createdAt: "", updatedAt: "" }] };
}
beforeEach(() => { mocks.generate.mockReset().mockResolvedValue("Revised passage."); mocks.resolve.mockReset().mockReturnValue("subscription"); });
describe("chapter assistant provider requests", () => {
  it("uses the current unsaved editor text and returns a scoped suggestion without mutating the chapter", async () => {
    const p = project();
    const result = await runChapterAssistant(p, "c", { action: "rewrite", content: "Opening. Target. Ending.", selection: { start: 9, end: 16 }, instruction: "Add tension" });
    expect(result.replacement).toBe("Revised passage."); expect(result.selection).toEqual({ start: 9, end: 16 });
    const args = mocks.generate.mock.calls[0][0] as GenerateChapterRequest;
    expect(args.userPrompt).toContain('"Opening. Target. Ending."'); expect(args.userPrompt).toContain('"Target."');
    expect(args.userPrompt).toContain("Revise only the target text"); expect(p.chapters[0].content).toBe("Saved chapter");
  });
  it("allows questions on a locked chapter and rejects edits", async () => {
    expect((await runChapterAssistant(project(true), "c", { action: "ask", content: "Draft", instruction: "Does it work?" })).answer).toBe("Revised passage.");
    await expect(runChapterAssistant(project(true), "c", { action: "humanize", content: "Draft" })).rejects.toMatchObject({ status: 409 });
  });
  it("passes polish strength and focus and preserves voice in its instructions", async () => {
    await runChapterAssistant(project(), "c", { action: "humanize", content: "Draft", strength: "balanced", focus: ["dialogue"] });
    const args = mocks.generate.mock.calls[0][0] as GenerateChapterRequest;
    expect(args.userPrompt).toContain("Strength: balanced"); expect(args.userPrompt).toContain("Focus: dialogue"); expect(args.systemPrompt).toContain("POV, and tense");
  });
  it("rejects invalid analysis and reports missing credentials", async () => {
    await expect(runChapterAssistant(project(), "c", { action: "analyze", content: "Draft" })).rejects.toMatchObject({ status: 502 });
    mocks.resolve.mockReturnValue(undefined as unknown as string);
    await expect(runChapterAssistant(project(), "c", { action: "ask", content: "Draft", instruction: "Why?" })).rejects.toMatchObject({ status: 400 });
  });
  it("automatically retries invalid analysis using its native schema", async () => {
    const report = { assessment: "A quiet scene.", categories: Object.fromEntries(["engagement", "character", "structure", "prose", "coherence"].map(key => [key, { score: 75, explanation: "Reason" }])), strengths: [{quote:"Draft", comment:"Clear"}], improvements:[{quote:"Draft",issue:"Too brief",suggestion:"Develop the scene"}] };
    mocks.generate.mockResolvedValueOnce("invalid").mockResolvedValueOnce(JSON.stringify(report));
    const result = await runChapterAssistant(project(), "c", { action: "analyze", content: "Draft" });
    expect(result.analysis?.overall).toBe(75);
    expect(mocks.generate).toHaveBeenCalledTimes(2);
    expect(mocks.generate.mock.calls[0][0].outputSchema.properties.categories).toBeDefined();
    expect(mocks.generate.mock.calls[1][0].userPrompt).toContain("previous report failed validation");
  });
  it("never stores an interrupted response", async () => {
    const controller = new AbortController();
    mocks.generate.mockImplementationOnce(async () => { controller.abort(); return "Partial prose"; });
    await expect(runChapterAssistant(project(), "c", { action: "humanize", content: "Draft" }, controller.signal)).rejects.toMatchObject({ name: "AbortError" });
  });
});
