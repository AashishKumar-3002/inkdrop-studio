import {
  AISettings,
  BookMeta,
  Chapter,
  ImageSettings,
  Project,
  RollingSummary,
  Storyboard,
  StoryBible,
} from "./types";

async function json<T>(res: Response): Promise<T> {
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error(body.error || `Request failed: ${res.status}`);
  }
  return res.json();
}

export const api = {
  listProjects: () => fetch("/api/projects").then((r) => json<Project[]>(r)),
  createProject: (name: string) =>
    fetch("/api/projects", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name }),
    }).then((r) => json<Project>(r)),
  importProject: (data: unknown) =>
    fetch("/api/projects/import", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    }).then((r) => json<Project>(r)),
  getProject: (id: string) =>
    fetch(`/api/projects/${id}`).then((r) => json<Project>(r)),
  deleteProject: (id: string) =>
    fetch(`/api/projects/${id}`, { method: "DELETE" }).then((r) => json(r)),
  saveBible: (id: string, storyBible: StoryBible, onboardingComplete?: boolean) =>
    fetch(`/api/projects/${id}/bible`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ storyBible, onboardingComplete }),
    }).then((r) => json<Project>(r)),
  extractBibleFromText: (id: string, text: string) =>
    fetch(`/api/projects/${id}/bible/extract`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ text }),
    }).then((r) => json<{ project: Project; filledCount: number }>(r)),
  saveSettings: (id: string, aiSettings: Partial<AISettings>) =>
    fetch(`/api/projects/${id}/settings`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(aiSettings),
    }).then((r) => json<Project>(r)),
  saveImageSettings: (id: string, imageSettings: Partial<ImageSettings>) =>
    fetch(`/api/projects/${id}/image-settings`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(imageSettings),
    }).then((r) => json<Project>(r)),
  saveRollingSummarySettings: (id: string, patch: Partial<RollingSummary>) =>
    fetch(`/api/projects/${id}/rolling-summary`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(patch),
    }).then((r) => json<Project>(r)),
  saveBook: (id: string, book: Partial<BookMeta>) =>
    fetch(`/api/projects/${id}/book`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(book),
    }).then((r) => json<Project>(r)),
  suggestCoverDirections: (id: string, vision: string) =>
    fetch(`/api/projects/${id}/book/cover/suggest`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ vision }),
    }).then((r) => json<{ directions: string[] }>(r)),
  generateCover: (id: string, prompt: string) =>
    fetch(`/api/projects/${id}/book/cover/generate`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ prompt }),
    }).then((r) => json<{ imageDataUrl: string }>(r)),
  createChapter: (
    id: string,
    data: { title?: string; idea?: string; content?: string; status?: Chapter["status"]; mode?: Chapter["mode"] }
  ) =>
    fetch(`/api/projects/${id}/chapters`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    }).then((r) => json<Chapter>(r)),
  updateChapter: (id: string, chapterId: string, patch: Partial<Chapter>) =>
    fetch(`/api/projects/${id}/chapters/${chapterId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(patch),
    }).then((r) => json<Chapter>(r)),
  deleteChapter: (id: string, chapterId: string) =>
    fetch(`/api/projects/${id}/chapters/${chapterId}`, {
      method: "DELETE",
    }).then((r) => json(r)),
  suggestChapterTitle: (id: string, chapterId: string) =>
    fetch(`/api/projects/${id}/chapters/${chapterId}/suggest-title`, {
      method: "POST",
    }).then((r) => json<{ title: string }>(r)),
  generateChapter: async (
    id: string,
    chapterId: string,
    opts: { provider?: string; model?: string },
    onChunk: (chunk: string) => void
  ): Promise<string> => {
    const res = await fetch(`/api/projects/${id}/chapters/${chapterId}/generate`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(opts),
    });
    if (!res.ok || !res.body) {
      const body = await res.json().catch(() => ({}));
      throw new Error(body.error || "Generation failed to start");
    }
    const reader = res.body.getReader();
    const decoder = new TextDecoder();
    let full = "";
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      const chunk = decoder.decode(value, { stream: true });
      full += chunk;
      onChunk(chunk);
    }
    return full;
  },
  saveStoryboard: (id: string, storyboard: Pick<Storyboard, "notes" | "strokes">) =>
    fetch(`/api/projects/${id}/storyboard`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(storyboard),
    }).then((r) => json<Project>(r)),
  askStoryboardAgent: (id: string, question: string, canvasImageDataUrl?: string) =>
    fetch(`/api/projects/${id}/storyboard/ask`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ question, canvasImageDataUrl }),
    }).then((r) => json<{ answer: string; chat: Storyboard["chat"] }>(r)),
};
