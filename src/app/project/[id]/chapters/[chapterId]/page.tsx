"use client";

import { useEffect, useRef, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { api } from "@/lib/api";
import { Chapter } from "@/lib/types";

export default function ChapterWorkspacePage() {
  const { id, chapterId } = useParams<{ id: string; chapterId: string }>();
  const router = useRouter();
  const [chapter, setChapter] = useState<Chapter | null>(null);
  const [idea, setIdea] = useState("");
  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  const [generating, setGenerating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [saveStatus, setSaveStatus] = useState<"idle" | "saving" | "saved">("idle");
  const [view, setView] = useState<"edit" | "preview">("edit");
  const [suggesting, setSuggesting] = useState(false);
  const contentRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    api.getProject(id).then((p) => {
      const c = p.chapters.find((ch) => ch.id === chapterId);
      if (c) {
        setChapter(c);
        setIdea(c.idea);
        setTitle(c.title);
        setContent(c.content);
      }
    });
  }, [id, chapterId]);

  const locked = chapter?.locked ?? false;

  async function saveField(patch: Partial<Chapter>) {
    setSaveStatus("saving");
    try {
      const updated = await api.updateChapter(id, chapterId, patch);
      setChapter(updated);
      setSaveStatus("saved");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Couldn't save that change.");
      setSaveStatus("idle");
      return;
    }
    setTimeout(() => setSaveStatus("idle"), 1000);
  }

  async function toggleLock() {
    if (!chapter) return;
    const updated = await api.updateChapter(id, chapterId, { locked: !chapter.locked });
    setChapter(updated);
  }

  async function generate() {
    if (locked) return;
    setError(null);
    setGenerating(true);
    setContent("");
    // persist the idea/title first so the prompt builder sees the latest idea
    await api.updateChapter(id, chapterId, { idea, title });
    try {
      let acc = "";
      await api.generateChapter(id, chapterId, {}, (chunk) => {
        acc += chunk;
        setContent(acc);
        requestAnimationFrame(() => {
          contentRef.current?.scrollTo(0, contentRef.current.scrollHeight);
        });
      });
      const p = await api.getProject(id);
      const c = p.chapters.find((ch) => ch.id === chapterId);
      if (c) setChapter(c);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Generation failed");
    } finally {
      setGenerating(false);
    }
  }

  async function suggestTitle() {
    setSuggesting(true);
    setError(null);
    try {
      const { title: suggested } = await api.suggestChapterTitle(id, chapterId);
      setTitle(suggested);
      await saveField({ title: suggested });
    } catch (e) {
      setError(e instanceof Error ? e.message : "Couldn't suggest a title.");
    } finally {
      setSuggesting(false);
    }
  }

  if (!chapter) {
    return <div className="p-16 text-center text-neutral-400">Loading...</div>;
  }

  const looksUntitled = /^chapter\s+\d+$/i.test(title.trim()) || !title.trim();

  return (
    <div className="mx-auto flex w-full max-w-3xl flex-col px-6 py-10">
      <button
        onClick={() => router.push(`/project/${id}/chapters`)}
        className="mb-4 w-fit text-sm text-neutral-400 hover:text-neutral-700"
      >
        ← All chapters
      </button>

      {locked && (
        <div className="mb-4 flex items-center justify-between rounded-xl border border-amber-200 bg-amber-50 px-4 py-2.5 text-sm text-amber-800">
          <span>🔒 This chapter is locked — earlier changes here won&apos;t ripple into later chapters by accident.</span>
          <button onClick={toggleLock} className="font-medium underline">
            Unlock
          </button>
        </div>
      )}

      <div className="mb-2 flex items-center justify-between gap-2">
        <input
          className="flex-1 border-none bg-transparent text-2xl font-semibold text-neutral-900 focus:outline-none disabled:text-neutral-400"
          value={title}
          disabled={locked}
          onChange={(e) => setTitle(e.target.value)}
          onBlur={() => saveField({ title })}
        />
        <button
          onClick={toggleLock}
          title={locked ? "Unlock chapter" : "Lock chapter"}
          className="text-lg text-neutral-300 hover:text-neutral-700"
        >
          {locked ? "🔒" : "🔓"}
        </button>
        <span className="text-xs text-neutral-400">
          {saveStatus === "saving" ? "Saving..." : saveStatus === "saved" ? "Saved" : ""}
        </span>
      </div>
      {looksUntitled && !locked && (
        <button
          onClick={suggestTitle}
          disabled={suggesting}
          className="mb-4 w-fit text-xs text-neutral-400 underline hover:text-neutral-700 disabled:opacity-50"
        >
          {suggesting ? "Thinking of a title..." : "✨ Suggest a title"}
        </button>
      )}

      <div className="mb-6 rounded-2xl border border-neutral-200 bg-white p-5 shadow-sm">
        <label className="mb-2 block text-sm font-medium text-neutral-700">
          Your idea for this chapter
        </label>
        <textarea
          className="w-full rounded-xl border border-neutral-300 p-3 text-sm focus:border-neutral-900 focus:outline-none disabled:bg-neutral-50 disabled:text-neutral-400"
          rows={3}
          disabled={locked}
          placeholder="What must happen in this chapter? Be as specific or as loose as you like — or skip this and just write the chapter yourself below."
          value={idea}
          onChange={(e) => setIdea(e.target.value)}
          onBlur={() => saveField({ idea })}
        />
        <div className="mt-3 flex items-center justify-between">
          <p className="text-xs text-neutral-400">
            Inkdrop uses your story bible, the hidden story-so-far summary, and recent
            chapters as context.
          </p>
          <button
            onClick={generate}
            disabled={generating || locked}
            className="rounded-xl bg-neutral-900 px-5 py-2.5 text-sm font-medium text-white hover:bg-neutral-700 disabled:opacity-50"
          >
            {generating
              ? "Writing..."
              : chapter.content
              ? "Regenerate chapter"
              : "Generate chapter"}
          </button>
        </div>
        {error && <p className="mt-2 text-sm text-red-500">{error}</p>}
      </div>

      <div className="flex-1 rounded-2xl border border-neutral-200 bg-white p-5 shadow-sm">
        <div className="mb-2 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <label className="text-sm font-medium text-neutral-700">Chapter text</label>
            <div className="flex rounded-lg border border-neutral-300 p-0.5">
              <button
                onClick={() => setView("edit")}
                className={`rounded-md px-2.5 py-0.5 text-xs ${
                  view === "edit" ? "bg-neutral-900 text-white" : "text-neutral-500"
                }`}
              >
                Edit
              </button>
              <button
                onClick={() => setView("preview")}
                className={`rounded-md px-2.5 py-0.5 text-xs ${
                  view === "preview" ? "bg-neutral-900 text-white" : "text-neutral-500"
                }`}
              >
                Preview
              </button>
            </div>
          </div>
          <span className="text-xs text-neutral-400">
            {content.trim() ? content.trim().split(/\s+/).length : 0} words
          </span>
        </div>

        {view === "edit" ? (
          <textarea
            ref={contentRef}
            className="h-[60vh] w-full resize-none rounded-xl border border-neutral-200 p-4 font-serif text-[15px] leading-relaxed text-neutral-800 focus:border-neutral-900 focus:outline-none disabled:bg-neutral-50 disabled:text-neutral-400"
            value={content}
            disabled={locked}
            onChange={(e) => setContent(e.target.value)}
            onBlur={() => saveField({ content })}
            placeholder="Generated (or hand-written) prose will appear here — fully editable. If you already have this chapter written, just paste it in."
          />
        ) : (
          <div className="h-[60vh] overflow-y-auto rounded-xl border border-neutral-200 bg-neutral-50/50 p-6 font-serif text-[15px] leading-relaxed text-neutral-800">
            {content.trim() ? (
              content
                .split(/\n{2,}/)
                .map((para, i) => (
                  <p key={i} className="mb-4 whitespace-pre-wrap">
                    {para}
                  </p>
                ))
            ) : (
              <p className="text-neutral-400">Nothing to preview yet.</p>
            )}
          </div>
        )}
      </div>

      <div className="mt-4 flex flex-wrap items-center justify-between gap-2">
        <div className="flex flex-wrap items-center gap-2 text-xs">
          <span className="text-neutral-400">Export this chapter:</span>
          {(["md", "pdf", "epub"] as const).map((fmt) => (
            <a
              key={fmt}
              href={`/api/projects/${id}/chapters/${chapterId}/export?format=${fmt}`}
              className="rounded-lg border border-neutral-300 px-3 py-1.5 text-neutral-600 hover:border-neutral-500"
            >
              .{fmt}
            </a>
          ))}
        </div>
        <button
          onClick={() => saveField({ content, status: "final" })}
          disabled={locked}
          className="rounded-xl border border-neutral-300 px-4 py-2 text-sm text-neutral-700 hover:border-neutral-500 disabled:opacity-50"
        >
          Mark as final
        </button>
      </div>
    </div>
  );
}
