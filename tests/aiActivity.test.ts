import { afterEach, describe, expect, it, vi } from "vitest";
import { api } from "@/lib/api";
import { activitySnapshot, dismissActivity } from "@/lib/aiActivity";

afterEach(() => {
  vi.unstubAllGlobals();
  activitySnapshot().forEach(item => dismissActivity(item.id));
});

function streamResponse(events: unknown[]) {
  const bytes = new TextEncoder().encode(events.map(event => JSON.stringify(event)).join("\n") + "\n");
  return new Response(new ReadableStream({ start(controller) {
    // Deliberately split JSON records and multibyte characters across reads.
    for (let offset = 0; offset < bytes.length; offset += 7) controller.enqueue(bytes.slice(offset, offset + 7));
    controller.close();
  } }));
}

describe("AI activity and chapter events", () => {
  it("separates status headings from streamed prose and preserves split Unicode", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(streamResponse([
      { type: "status", heading: "Writing chapter…" },
      { type: "text", text: "Café " },
      { type: "status", heading: "Updating continuity summary…" },
      { type: "text", text: "at dawn." },
      { type: "complete" },
    ])));
    const chunks: string[] = [];
    expect(await api.generateChapter("project", "chapter", {}, text => chunks.push(text))).toBe("Café at dawn.");
    expect(chunks).toEqual(["Café ", "at dawn."]);
    expect(activitySnapshot()[0].state).toBe("complete");
  });
  it("reports a provider failure without putting the error in the draft", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(streamResponse([
      { type: "text", text: "A beginning." },
      { type: "error", message: "Usage limit reached" },
    ])));
    const chunks: string[] = [];
    await expect(api.generateChapter("project", "chapter", {}, text => chunks.push(text))).rejects.toThrow("Usage limit");
    expect(chunks).toEqual(["A beginning."]);
    expect(activitySnapshot()[0].state).toBe("failed");
  });
  it("does not call a truncated stream complete", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(streamResponse([{ type: "text", text: "Partial" }])));
    await expect(api.generateChapter("p", "c", {}, () => {})).rejects.toThrow("unexpectedly");
    expect(activitySnapshot()[0].state).toBe("failed");
  });
  it("shows activity throughout Bible extraction and returns the updated project", async () => {
    let respond!: (response: Response) => void;
    vi.stubGlobal("fetch", vi.fn().mockImplementation(() => new Promise<Response>(resolve => { respond = resolve; })));
    const pending = api.extractBibleFromText("p", "Notes");
    expect(activitySnapshot()[0]).toMatchObject({ state: "working", heading: "Extracting Bible answers…" });
    respond(Response.json({ project: { storyBible: { feel: { notes: "Imported" } } }, filledCount: 1 }));
    expect((await pending).project.storyBible.feel.notes).toBe("Imported");
    expect(activitySnapshot()[0]).toMatchObject({ state: "complete", heading: "Bible import complete" });
  });
});
