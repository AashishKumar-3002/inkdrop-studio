"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { toast } from "sonner";
import {
  BookOpen,
  Lock,
  LockOpen,
  Plus,
  Rows3,
  LayoutGrid,
  Trash2,
  Upload,
  X,
} from "lucide-react";
import { api, ApiError } from "@/lib/api";
import { Chapter, ChapterStatus } from "@/lib/types";
import {
  Badge,
  Button,
  Card,
  EmptyState,
  ErrorState,
  Field,
  Input,
  Select,
  Skeleton,
  Textarea,
} from "@/components/ui";

const STATUS_LABEL: Record<ChapterStatus, string> = {
  idea: "Idea only",
  generating: "Generating…",
  drafted: "Drafted",
  final: "Final",
};

const STATUS_TONE: Record<ChapterStatus, "neutral" | "accent" | "success"> = {
  idea: "neutral",
  generating: "accent",
  drafted: "neutral",
  final: "success",
};

type PendingUpload = {
  file: File;
  title: string;
  status: "drafted" | "final";
};

type ViewMode = "list" | "grid";

function titleFromFilename(filename: string) {
  return filename
    .replace(/\.[^.]+$/, "")
    .replace(/[_-]+/g, " ")
    .trim();
}

export default function ChaptersPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const [chapters, setChapters] = useState<Chapter[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [view, setView] = useState<ViewMode>("list");

  const [showForm, setShowForm] = useState(false);
  const [mode, setMode] = useState<"ai" | "manual">("ai");
  const [newTitle, setNewTitle] = useState("");
  const [newIdea, setNewIdea] = useState("");
  const [newContent, setNewContent] = useState("");
  const [newStatus, setNewStatus] = useState<"drafted" | "final">("drafted");
  const [creating, setCreating] = useState(false);

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

  function setViewMode(v: ViewMode) {
    setView(v);
    try {
      localStorage.setItem("inkdrop:chaptersView", v);
    } catch {
      // ignore — per-viewer convenience only
    }
  }

  const load = useCallback(() => {
    api
      .getProject(id)
      .then((p) => setChapters(p.chapters))
      .catch((e: Error) => setLoadError(e.message))
      .finally(() => setLoading(false));
  }, [id]);

    // The effect only kicks off the request; every setState lands in a
  // promise callback, satisfying React's no-sync-setState-in-effect rule.
  useEffect(() => {
    load();
  }, [load]);

  /** Retry from the error state — a click handler, so setState is fine. */
  const retry = useCallback(() => {
    setLoading(true);
    setLoadError(null);
    load();
  }, [load]);

  async function addChapter() {
    if (creating) return;
    setCreating(true);
    try {
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
      } else {
        toast.success("Chapter added.");
      }
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Couldn't create that chapter.");
    } finally {
      setCreating(false);
    }
  }

  async function removeChapter(chapterId: string) {
    if (!confirm("Delete this chapter?")) return;
    const previous = chapters;
    setChapters((prev) => prev.filter((c) => c.id !== chapterId));
    try {
      await api.deleteChapter(id, chapterId);
      toast.success("Chapter deleted.");
    } catch (e) {
      setChapters(previous);
      if (e instanceof ApiError && e.status === 409) {
        toast.error(e.message);
        load();
      } else {
        toast.error(e instanceof Error ? e.message : "Couldn't delete this chapter.");
      }
    }
  }

  async function toggleLock(chapter: Chapter) {
    try {
      const updated = await api.updateChapter(id, chapter.id, { locked: !chapter.locked });
      setChapters((prev) => prev.map((c) => (c.id === chapter.id ? updated : c)));
    } catch (e) {
      if (e instanceof ApiError && e.status === 409) {
        toast.error(e.message);
        load();
      } else {
        toast.error(e instanceof Error ? e.message : "Couldn't update that chapter.");
      }
    }
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
      const toImport = await Promise.all(
        pending.map(async (item) => ({
          title: item.title || "Untitled chapter",
          content: await item.file.text(),
          status: item.status as ChapterStatus,
        }))
      );
      const { chapters: created } = await api.createChapters(id, toImport);
      setChapters((prev) => [...prev, ...created]);
      setPending([]);
      setShowUpload(false);
      toast.success(
        `Imported ${created.length} chapter${created.length === 1 ? "" : "s"}.`
      );
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Couldn't import those chapters.");
    } finally {
      setUploading(false);
    }
  }

  const viewToggle = (
    <div className="flex rounded-lg border border-line p-0.5" role="group" aria-label="Chapter view">
      <Button
        variant={view === "list" ? "primary" : "ghost"}
        size="sm"
        aria-pressed={view === "list"}
        onClick={() => setViewMode("list")}
        className="h-7 px-2.5"
      >
        <Rows3 className="h-3.5 w-3.5" aria-hidden />
        List
      </Button>
      <Button
        variant={view === "grid" ? "primary" : "ghost"}
        size="sm"
        aria-pressed={view === "grid"}
        onClick={() => setViewMode("grid")}
        className="h-7 px-2.5"
      >
        <LayoutGrid className="h-3.5 w-3.5" aria-hidden />
        Grid
      </Button>
    </div>
  );

  return (
    <div className="mx-auto w-full max-w-4xl px-4 py-10 sm:px-6">
      <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-2xl font-semibold tracking-tight text-ink">Chapters</h1>
        <div className="flex flex-wrap items-center gap-2">
          {viewToggle}
          <Button variant="secondary" size="sm" onClick={() => fileInputRef.current?.click()}>
            <Upload className="h-3.5 w-3.5" aria-hidden />
            Upload chapters
          </Button>
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
          <Button size="sm" onClick={() => setShowForm((s) => !s)}>
            <Plus className="h-3.5 w-3.5" aria-hidden />
            New chapter
          </Button>
        </div>
      </div>

      {showUpload && pending.length > 0 && (
        <Card className="mb-6 p-5">
          <h3 className="mb-3 text-sm font-semibold text-ink">
            Set a title and status for each uploaded chapter
          </h3>
          <div className="space-y-2">
            {pending.map((item, i) => (
              <div
                key={i}
                className="flex flex-col gap-2 rounded-lg border border-line p-3 sm:flex-row sm:items-center"
              >
                <Input
                  className="flex-1"
                  aria-label={`Title for ${item.file.name}`}
                  value={item.title}
                  onChange={(e) =>
                    setPending((prev) =>
                      prev.map((p, idx) => (idx === i ? { ...p, title: e.target.value } : p))
                    )
                  }
                />
                <Select
                  className="w-full sm:w-32"
                  aria-label={`Status for ${item.file.name}`}
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
                </Select>
                <Button
                  variant="ghost"
                  size="icon"
                  aria-label={`Remove ${item.file.name} from import`}
                  onClick={() => setPending((prev) => prev.filter((_, idx) => idx !== i))}
                >
                  <X className="h-4 w-4" aria-hidden />
                </Button>
              </div>
            ))}
          </div>
          <div className="mt-4 flex justify-end gap-2">
            <Button
              variant="ghost"
              onClick={() => {
                setPending([]);
                setShowUpload(false);
              }}
            >
              Cancel
            </Button>
            <Button onClick={confirmUpload} loading={uploading}>
              Import {pending.length} chapter{pending.length === 1 ? "" : "s"}
            </Button>
          </div>
        </Card>
      )}

      {showForm && (
        <Card className="mb-6 p-5">
          <div className="mb-3 flex w-fit rounded-lg border border-line p-0.5">
            <Button
              variant={mode === "ai" ? "primary" : "ghost"}
              size="sm"
              className="h-7 px-3"
              onClick={() => setMode("ai")}
            >
              Generate with AI
            </Button>
            <Button
              variant={mode === "manual" ? "primary" : "ghost"}
              size="sm"
              className="h-7 px-3"
              onClick={() => setMode("manual")}
            >
              I already have this chapter
            </Button>
          </div>
          <div className="space-y-3">
            <Field label="Title" hint="Optional — you can name it later" htmlFor="new-chapter-title">
              <Input
                id="new-chapter-title"
                placeholder={`Chapter ${chapters.length + 1} title`}
                value={newTitle}
                onChange={(e) => setNewTitle(e.target.value)}
              />
            </Field>
            {mode === "ai" ? (
              <Field label="What should happen in this chapter?" htmlFor="new-chapter-idea">
                <Textarea
                  id="new-chapter-idea"
                  rows={3}
                  placeholder="e.g. He finally confronts his brother about the letter, but gets interrupted before he can say why he really came."
                  value={newIdea}
                  onChange={(e) => setNewIdea(e.target.value)}
                />
              </Field>
            ) : (
              <>
                <Field label="Chapter text" htmlFor="new-chapter-content">
                  <Textarea
                    id="new-chapter-content"
                    rows={6}
                    placeholder="Paste the chapter text here…"
                    value={newContent}
                    onChange={(e) => setNewContent(e.target.value)}
                  />
                </Field>
                <Field label="Status" htmlFor="new-chapter-status" className="max-w-[10rem]">
                  <Select
                    id="new-chapter-status"
                    value={newStatus}
                    onChange={(e) => setNewStatus(e.target.value as "drafted" | "final")}
                  >
                    <option value="drafted">Draft</option>
                    <option value="final">Final</option>
                  </Select>
                </Field>
              </>
            )}
          </div>
          <div className="mt-4 flex justify-end gap-2">
            <Button variant="ghost" onClick={() => setShowForm(false)}>
              Cancel
            </Button>
            <Button onClick={addChapter} loading={creating}>
              Create chapter
            </Button>
          </div>
        </Card>
      )}

      {loading ? (
        <div className={view === "grid" ? "grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3" : "space-y-2"}>
          <Skeleton className="h-20" />
          <Skeleton className="h-20" />
          <Skeleton className="h-20" />
        </div>
      ) : loadError ? (
        <ErrorState message={loadError} onRetry={retry} />
      ) : chapters.length === 0 ? (
        <EmptyState
          icon={<BookOpen className="h-8 w-8" />}
          title="No chapters yet"
          description={
            <>
              Add one with just a rough idea &mdash; Inkdrop will draft the full chapter
              for you, in your story&rsquo;s voice &mdash; or upload chapters you&rsquo;ve
              already written.
            </>
          }
        />
      ) : view === "list" ? (
        <ul className="space-y-2">
          {chapters.map((c) => (
            <li key={c.id}>
              <Card className="group flex items-center gap-3 px-5 py-4 transition-colors hover:border-line-strong">
                <button
                  className="min-w-0 flex-1 text-left"
                  onClick={() => router.push(`/project/${id}/chapters/${c.id}`)}
                >
                  <div className="flex items-center gap-2 truncate font-medium text-ink">
                    {c.locked && <Lock className="h-3.5 w-3.5 shrink-0 text-ink-subtle" aria-label="Locked" />}
                    <span className="truncate">
                      Ch. {c.index}: {c.title}
                    </span>
                  </div>
                  <div className="mt-1 flex items-center gap-2 text-xs text-ink-muted">
                    <Badge tone={STATUS_TONE[c.status]}>{STATUS_LABEL[c.status]}</Badge>
                    {c.wordCount > 0 && <span>{c.wordCount} words</span>}
                  </div>
                  {c.idea && (
                    <div className="mt-1 truncate text-xs text-ink-subtle">Idea: {c.idea}</div>
                  )}
                </button>
                <div className="ml-2 flex shrink-0 items-center gap-1">
                  <Button
                    variant="ghost"
                    size="icon"
                    aria-label={c.locked ? `Unlock chapter ${c.index}` : `Lock chapter ${c.index}`}
                    title={c.locked ? "Unlock chapter" : "Lock chapter"}
                    onClick={() => toggleLock(c)}
                  >
                    {c.locked ? (
                      <Lock className="h-4 w-4" aria-hidden />
                    ) : (
                      <LockOpen className="h-4 w-4" aria-hidden />
                    )}
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    aria-label={`Delete chapter ${c.index}`}
                    disabled={c.locked}
                    onClick={() => removeChapter(c.id)}
                    className="opacity-0 transition-opacity hover:text-danger focus-visible:opacity-100 group-hover:opacity-100"
                  >
                    <Trash2 className="h-4 w-4" aria-hidden />
                  </Button>
                </div>
              </Card>
            </li>
          ))}
        </ul>
      ) : (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {chapters.map((c) => (
            <Card
              key={c.id}
              className="group flex flex-col p-4 transition-colors hover:border-line-strong"
            >
              <button
                className="flex-1 text-left"
                onClick={() => router.push(`/project/${id}/chapters/${c.id}`)}
              >
                <div className="flex items-center gap-2 truncate font-medium text-ink">
                  {c.locked && <Lock className="h-3.5 w-3.5 shrink-0 text-ink-subtle" aria-label="Locked" />}
                  <span className="truncate">
                    Ch. {c.index}: {c.title}
                  </span>
                </div>
                <div className="mt-1 flex items-center gap-2 text-xs text-ink-muted">
                  <Badge tone={STATUS_TONE[c.status]}>{STATUS_LABEL[c.status]}</Badge>
                  {c.wordCount > 0 && <span>{c.wordCount} words</span>}
                </div>
                <p className="mt-2 line-clamp-4 text-xs text-ink-subtle">
                  {c.content?.trim() || c.idea || "No content yet."}
                </p>
              </button>
              <div className="mt-3 flex items-center justify-between border-t border-line pt-2">
                <Button
                  variant="ghost"
                  size="icon"
                  aria-label={c.locked ? `Unlock chapter ${c.index}` : `Lock chapter ${c.index}`}
                  title={c.locked ? "Unlock chapter" : "Lock chapter"}
                  onClick={() => toggleLock(c)}
                >
                  {c.locked ? (
                    <Lock className="h-4 w-4" aria-hidden />
                  ) : (
                    <LockOpen className="h-4 w-4" aria-hidden />
                  )}
                </Button>
                <Button
                  variant="ghost"
                  size="icon"
                  aria-label={`Delete chapter ${c.index}`}
                  disabled={c.locked}
                  onClick={() => removeChapter(c.id)}
                  className="opacity-0 transition-opacity hover:text-danger focus-visible:opacity-100 group-hover:opacity-100"
                >
                  <Trash2 className="h-4 w-4" aria-hidden />
                </Button>
              </div>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
