"use client";

import { useEffect, useRef, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { api } from "@/lib/api";
import { Chapter } from "@/lib/types";

const STATUS_LABEL: Record<Chapter["status"], string> = {
  idea: "Idea only",
  generating: "Generating...",
  drafted: "Drafted",
  final: "Final",
};

type PendingUpload = {
  file: File;
  title: string;
  status: "drafted" | "final";
};

export default function ChaptersPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const [chapters, setChapters] = useState<Chapter[]>([]);
  const [loading, setLoading] = useState(true);
  const [view, setView] = useState<"list" | "grid">("list");

  const [showForm, setShowForm] = useState(false);
  const [mode, setMode] = useState<"ai" | "manual">("ai");
  const [newTitle, setNewTitle] = useState("");
  const [newIdea, setNewIdea] = useState("");
  const [newContent, setNewContent] = useState("");
  const [newStatus, setNewStatus] = useState<"drafted" | "final">("drafted");

  const [showUpload, setShowUpload] = useState(false);
  const [pending, setPending] = useState<PendingUpload[]>([]);
  const [uploading, setUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    let saved: string | null = null;
    try {
      saved = localStorage.getItem("inkdrop:chaptersView");
    } catch {
      // per-viewer convenience only — ignore if storage is unavailable
    }
    if (saved === "grid" || saved === "list") {
      // Reads a persisted UI preference once on mount, after the initial
      // (SSR-matching) render — an effect is the right tool here, not a
      // lazy useState initializer, since that would run during SSR too and
      // could mismatch the client's localStorage value.
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setView(saved);
    }
  }, []);

  function setViewMode(v: "list" | "grid") {
    setView(v);
    try {
      localStorage.setItem("inkdrop:chaptersView", v);
    } catch {
      // ignore — per-viewer convenience only
    }
  }

  useEffect(() => {
    api.getProject(id).then((p) => {
      setChapters(p.chapters);
      setLoading(false);
    });
  }, [id]);

  async function addChapter() {
    const chapter = await api.createChapter(id, {
      title: newTitle || undefined,
      idea: mode === "ai" ? newIdea : "",
      content: mode === "manual" ? newContent : undefined,
      status: mode === "manual" ? newStatus : "idea",
      mode,
    });
    setChapters((prev) => [...prev, chapter]);
    setNewTitle("");
    setNewIdea("");
    setNewContent("");
    setShowForm(false);
    if (mode === "ai") {
      router.push(`/project/${id}/chapters/${chapter.id}`);
    }
  }

  async function removeChapter(chapterId: string) {
    if (!confirm("Delete this chapter?")) return;
    try {
      await api.deleteChapter(id, chapterId);
      const p = await api.getProject(id);
      setChapters(p.chapters);
    } catch (e) {
      alert(e instanceof Error ? e.message : "Couldn't delete this chapter.");
    }
  }

  async function toggleLock(chapter: Chapter) {
    const updated = await api.updateChapter(id, chapter.id, { locked: !chapter.locked });
    setChapters((prev) => prev.map((c) => (c.id === chapter.id ? updated : c)));
  }

  function titleFromFilename(filename: string) {
    return filename.replace(/\.[^.]+$/, "").replace(/[_-]+/g, " ").trim();
  }

  function queueFiles(files: FileList) {
    const items: PendingUpload[] = Array.from(files).map((file) => ({
      file,
      title: titleFromFilename(file.name),
      status: "drafted",
    }));
    setPending((prev) => [...prev, ...items]);
    setShowUpload(true);
  }

  async function confirmUpload() {
    setUploading(true);
    try {
      const created: Chapter[] = [];
      for (const item of pending) {
        const content = await item.file.text();
        const chapter = await api.createChapter(id, {
          title: item.title || undefined,
          content,
          status: item.status,
          mode: "manual",
        });
        created.push(chapter);
      }
      setChapters((prev) => [...prev, ...created]);
      setPending([]);
      setShowUpload(false);
    } finally {
      setUploading(false);
    }
  }

  return (
    <div className="mx-auto w-full max-w-4xl px-6 py-10">
      <div className="mb-6 flex items-center justify-between">
        <h1 className="text-2xl font-semibold text-neutral-900">Chapters</h1>
        <div className="flex items-center gap-2">
          <div className="flex rounded-lg border border-neutral-300 p-0.5">
            <button
              onClick={() => setViewMode("list")}
              className={`rounded-md px-2.5 py-1 text-xs ${
                view === "list" ? "bg-neutral-900 text-white" : "text-neutral-500"
              }`}
            >
              List
            </button>
            <button
              onClick={() => setViewMode("grid")}
              className={`rounded-md px-2.5 py-1 text-xs ${
                view === "grid" ? "bg-neutral-900 text-white" : "text-neutral-500"
              }`}
            >
              Grid
            </button>
          </div>
          <button
            onClick={() => fileInputRef.current?.click()}
            className="rounded-xl border border-neutral-300 px-4 py-2 text-sm text-neutral-700 hover:border-neutral-500"
          >
            Upload chapters
          </button>
          <input
            ref={fileInputRef}
            type="file"
            multiple
            accept=".txt,.md,text/plain,text/markdown"
            className="hidden"
            onChange={(e) => {
              if (e.target.files?.length) queueFiles(e.target.files);
              e.target.value = "";
            }}
          />
          <button
            onClick={() => setShowForm((s) => !s)}
            className="rounded-xl bg-neutral-900 px-4 py-2 text-sm font-medium text-white hover:bg-neutral-700"
          >
            + New chapter
          </button>
        </div>
      </div>

      {showUpload && pending.length > 0 && (
        <div className="mb-6 space-y-3 rounded-2xl border border-neutral-200 bg-white p-5 shadow-sm">
          <h3 className="text-sm font-medium text-neutral-700">
            Set a title and status for each uploaded chapter
          </h3>
          {pending.map((item, i) => (
            <div key={i} className="flex items-center gap-2 rounded-xl border border-neutral-200 p-3">
              <input
                className="flex-1 rounded-lg border border-neutral-300 px-3 py-1.5 text-sm focus:border-neutral-900 focus:outline-none"
                value={item.title}
                onChange={(e) =>
                  setPending((prev) =>
                    prev.map((p, idx) => (idx === i ? { ...p, title: e.target.value } : p))
                  )
                }
              />
              <select
                className="rounded-lg border border-neutral-300 px-2 py-1.5 text-sm"
                value={item.status}
                onChange={(e) =>
                  setPending((prev) =>
                    prev.map((p, idx) =>
                      idx === i ? { ...p, status: e.target.value as "drafted" | "final" } : p
                    )
                  )
                }
              >
                <option value="drafted">Draft</option>
                <option value="final">Final</option>
              </select>
              <button
                onClick={() => setPending((prev) => prev.filter((_, idx) => idx !== i))}
                className="text-xs text-neutral-400 hover:text-red-500"
              >
                Remove
              </button>
            </div>
          ))}
          <div className="flex justify-end gap-2">
            <button
              onClick={() => {
                setPending([]);
                setShowUpload(false);
              }}
              className="rounded-xl px-4 py-2 text-sm text-neutral-500"
            >
              Cancel
            </button>
            <button
              onClick={confirmUpload}
              disabled={uploading}
              className="rounded-xl bg-neutral-900 px-4 py-2 text-sm font-medium text-white hover:bg-neutral-700 disabled:opacity-50"
            >
              {uploading ? "Importing..." : `Import ${pending.length} chapter${pending.length === 1 ? "" : "s"}`}
            </button>
          </div>
        </div>
      )}

      {showForm && (
        <div className="mb-6 space-y-3 rounded-2xl border border-neutral-200 bg-white p-5 shadow-sm">
          <div className="flex rounded-lg border border-neutral-300 p-0.5 w-fit">
            <button
              onClick={() => setMode("ai")}
              className={`rounded-md px-3 py-1 text-xs ${
                mode === "ai" ? "bg-neutral-900 text-white" : "text-neutral-500"
              }`}
            >
              Generate with AI
            </button>
            <button
              onClick={() => setMode("manual")}
              className={`rounded-md px-3 py-1 text-xs ${
                mode === "manual" ? "bg-neutral-900 text-white" : "text-neutral-500"
              }`}
            >
              I already have this chapter
            </button>
          </div>
          <input
            className="w-full rounded-xl border border-neutral-300 p-2.5 text-sm focus:border-neutral-900 focus:outline-none"
            placeholder={`Chapter ${chapters.length + 1} title (optional — you can name it later)`}
            value={newTitle}
            onChange={(e) => setNewTitle(e.target.value)}
          />
          {mode === "ai" ? (
            <textarea
              className="w-full rounded-xl border border-neutral-300 p-3 text-sm focus:border-neutral-900 focus:outline-none"
              rows={3}
              placeholder="What should happen in this chapter? e.g. 'He finally confronts his brother about the letter, but gets interrupted before he can say why he really came.'"
              value={newIdea}
              onChange={(e) => setNewIdea(e.target.value)}
            />
          ) : (
            <>
              <textarea
                className="w-full rounded-xl border border-neutral-300 p-3 text-sm focus:border-neutral-900 focus:outline-none"
                rows={6}
                placeholder="Paste the chapter text here..."
                value={newContent}
                onChange={(e) => setNewContent(e.target.value)}
              />
              <div className="flex items-center gap-2 text-sm text-neutral-600">
                <span>Status:</span>
                <select
                  className="rounded-lg border border-neutral-300 px-2 py-1.5 text-sm"
                  value={newStatus}
                  onChange={(e) => setNewStatus(e.target.value as "drafted" | "final")}
                >
                  <option value="drafted">Draft</option>
                  <option value="final">Final</option>
                </select>
              </div>
            </>
          )}
          <div className="flex justify-end gap-2">
            <button
              onClick={() => setShowForm(false)}
              className="rounded-xl px-4 py-2 text-sm text-neutral-500"
            >
              Cancel
            </button>
            <button
              onClick={addChapter}
              className="rounded-xl bg-neutral-900 px-4 py-2 text-sm font-medium text-white hover:bg-neutral-700"
            >
              Create chapter
            </button>
          </div>
        </div>
      )}

      {loading ? (
        <p className="text-sm text-neutral-400">Loading...</p>
      ) : chapters.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-neutral-300 p-10 text-center text-neutral-400">
          No chapters yet. Add one with just a rough idea — Inkdrop will draft the
          full chapter for you, in your story&rsquo;s voice — or upload chapters you&rsquo;ve
          already written.
        </div>
      ) : view === "list" ? (
        <ul className="space-y-2">
          {chapters.map((c) => (
            <li
              key={c.id}
              className="group flex items-center justify-between rounded-xl border border-neutral-200 bg-white px-5 py-4 shadow-sm hover:border-neutral-400"
            >
              <button
                className="flex-1 text-left"
                onClick={() => router.push(`/project/${id}/chapters/${c.id}`)}
              >
                <div className="flex items-center gap-2 font-medium text-neutral-900">
                  {c.locked && <span title="Locked">🔒</span>}
                  Ch. {c.index}: {c.title}
                </div>
                <div className="mt-0.5 text-xs text-neutral-400">
                  {STATUS_LABEL[c.status]}
                  {c.wordCount > 0 ? ` · ${c.wordCount} words` : ""}
                </div>
                {c.idea && (
                  <div className="mt-1 truncate text-xs text-neutral-400">Idea: {c.idea}</div>
                )}
              </button>
              <div className="ml-4 flex items-center gap-3">
                <button
                  onClick={() => toggleLock(c)}
                  title={c.locked ? "Unlock chapter" : "Lock chapter"}
                  className="text-sm text-neutral-300 hover:text-neutral-700"
                >
                  {c.locked ? "🔒" : "🔓"}
                </button>
                <button
                  onClick={() => removeChapter(c.id)}
                  className="text-xs text-neutral-300 opacity-0 transition hover:text-red-500 group-hover:opacity-100"
                >
                  Delete
                </button>
              </div>
            </li>
          ))}
        </ul>
      ) : (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {chapters.map((c) => (
            <div
              key={c.id}
              className="group flex flex-col rounded-2xl border border-neutral-200 bg-white p-4 shadow-sm hover:border-neutral-400"
            >
              <button
                className="flex-1 text-left"
                onClick={() => router.push(`/project/${id}/chapters/${c.id}`)}
              >
                <div className="flex items-center gap-2 font-medium text-neutral-900">
                  {c.locked && <span title="Locked">🔒</span>}
                  Ch. {c.index}: {c.title}
                </div>
                <div className="mt-0.5 text-xs text-neutral-400">
                  {STATUS_LABEL[c.status]}
                  {c.wordCount > 0 ? ` · ${c.wordCount} words` : ""}
                </div>
                <p className="mt-2 line-clamp-4 text-xs text-neutral-500">
                  {c.content?.trim() || c.idea || "No content yet."}
                </p>
              </button>
              <div className="mt-3 flex items-center justify-between border-t border-neutral-100 pt-2">
                <button
                  onClick={() => toggleLock(c)}
                  title={c.locked ? "Unlock chapter" : "Lock chapter"}
                  className="text-sm text-neutral-300 hover:text-neutral-700"
                >
                  {c.locked ? "🔒" : "🔓"}
                </button>
                <button
                  onClick={() => removeChapter(c.id)}
                  className="text-xs text-neutral-300 opacity-0 transition hover:text-red-500 group-hover:opacity-100"
                >
                  Delete
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
