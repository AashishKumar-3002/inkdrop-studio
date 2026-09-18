"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { toast } from "sonner";
import {
  ArrowLeft,
  Ban,
  ChevronLeft,
  ChevronRight,
  Download,
  Lock,
  LockOpen,
  Sparkles,
} from "lucide-react";
import { api, ApiError } from "@/lib/api";
import { AnswerMap, Chapter, ClientProject, SECTION_IDS } from "@/lib/types";
import {
  Badge,
  Button,
  Field,
  Kicker,
  Lbl,
  LoadingState,
  Panel,
  Textarea,
  Ticks,
  cn,
} from "@/components/ui";

type SaveStatus = "idle" | "saving" | "saved";
type TabId = "edit" | "preview";

const STATUS_LABEL: Record<Chapter["status"], string> = {
  idea: "Idea only",
  generating: "Generating…",
  drafted: "Drafted",
  final: "Final",
};

const STATUS_TONE: Record<Chapter["status"], "neutral" | "outline" | "accent"> = {
  idea: "neutral",
  generating: "outline",
  drafted: "neutral",
  final: "accent",
};

/** How many of the story bible's questions have actually been answered —
 *  shown as-is in the "Grounded in" panel, purely informational. */
function answeredCount(answers: AnswerMap): number {
  return Object.values(answers).filter((a) => a.selected.length > 0 || a.custom.trim()).length;
}

export default function ChapterWorkspacePage() {
  const { id, chapterId } = useParams<{ id: string; chapterId: string }>();
  const router = useRouter();
  const [project, setProject] = useState<ClientProject | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [idea, setIdea] = useState("");
  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  const [generating, setGenerating] = useState(false);
  const [saveStatus, setSaveStatus] = useState<SaveStatus>("idle");
  const [tab, setTab] = useState<TabId>("edit");
  const [suggesting, setSuggesting] = useState(false);
  const contentRef = useRef<HTMLTextAreaElement>(null);
  const abortRef = useRef<AbortController | null>(null);

  const chapter = useMemo(
    () => project?.chapters.find((c) => c.id === chapterId) ?? null,
    [project, chapterId]
  );

  const loadChapter = useCallback(() => {
    api
      .getProject(id)
      .then((p) => {
        const c = p.chapters.find((ch) => ch.id === chapterId);
        if (c) {
          setProject(p);
          setIdea(c.idea);
          setTitle(c.title);
          setContent(c.content);
        } else {
          setLoadError("This chapter no longer exists.");
        }
      })
      .catch((e: Error) => setLoadError(e.message));
  }, [id, chapterId]);

  // The effect only kicks off the request; every setState lands in a promise
  // callback, satisfying React's no-sync-setState-in-effect rule.
  useEffect(() => {
    loadChapter();
  }, [loadChapter]);

  /** Retry from the error state — a click handler, so setState is fine. */
  const retry = useCallback(() => {
    setLoadError(null);
    loadChapter();
  }, [loadChapter]);

  const locked = chapter?.locked ?? false;

  const dirty = useMemo(() => {
    if (!chapter) return false;
    return idea !== chapter.idea || title !== chapter.title || content !== chapter.content;
  }, [chapter, idea, title, content]);

  async function saveField(patch: Partial<Chapter>) {
    setSaveStatus("saving");
    try {
      const updated = await api.updateChapter(id, chapterId, patch);
      setProject((prev) =>
        prev
          ? { ...prev, chapters: prev.chapters.map((c) => (c.id === updated.id ? updated : c)) }
          : prev
      );
      setSaveStatus("saved");
      setTimeout(() => setSaveStatus("idle"), 1200);
    } catch (e) {
      setSaveStatus("idle");
      if (e instanceof ApiError && e.status === 409) {
        toast.error(e.message);
        loadChapter();
      } else {
        toast.error(e instanceof Error ? e.message : "Couldn't save that change.");
      }
    }
  }

  async function toggleLock() {
    if (!chapter) return;
    try {
      const updated = await api.updateChapter(id, chapterId, { locked: !chapter.locked });
      setProject((prev) =>
        prev
          ? { ...prev, chapters: prev.chapters.map((c) => (c.id === updated.id ? updated : c)) }
          : prev
      );
    } catch (e) {
      if (e instanceof ApiError && e.status === 409) {
        toast.error(e.message);
        loadChapter();
      } else {
        toast.error(e instanceof Error ? e.message : "Couldn't update that chapter.");
      }
    }
  }

  async function generate() {
    if (locked || !chapter) return;
    setGenerating(true);
    // Keep the source visible until replacement prose arrives.
    // persist the idea/title first so the prompt builder sees the latest idea
    try {
      await api.updateChapter(id, chapterId, { idea, title, content });
    } catch (e) {
      setGenerating(false);
      if (e instanceof ApiError && e.status === 409) {
        toast.error(e.message);
        loadChapter();
      } else {
        toast.error(e instanceof Error ? e.message : "Couldn't save before generating.");
      }
      return;
    }
    const controller = new AbortController();
    abortRef.current = controller;
    try {
      let acc = "";
      await api.generateChapter(
        id,
        chapterId,
        {},
        (chunk) => {
          acc += chunk;
          setContent(acc);
          requestAnimationFrame(() => {
            contentRef.current?.scrollTo(0, contentRef.current.scrollHeight);
          });
        },
        controller.signal
      );
      loadChapter();
    } catch (e) {
      // Whatever streamed so far is already saved server-side on abort — just
      // resync rather than treating a deliberate stop as an error.
      const aborted = e instanceof DOMException && e.name === "AbortError";
      if (!aborted) {
        if (e instanceof ApiError && e.status === 409) {
          toast.error(e.message);
        } else {
          toast.error(e instanceof Error ? e.message : "Generation failed.");
        }
      }
      loadChapter();
    } finally {
      setGenerating(false);
      abortRef.current = null;
    }
  }

  function stopGenerating() {
    abortRef.current?.abort();
  }

  async function suggestTitle() {
    setSuggesting(true);
    try {
      const { title: suggested } = await api.suggestChapterTitle(id, chapterId);
      setTitle(suggested);
      await saveField({ title: suggested });
    } catch (e) {
      if (e instanceof ApiError && e.status === 409) {
        toast.error(e.message);
        loadChapter();
      } else {
        toast.error(e instanceof Error ? e.message : "Couldn't suggest a title.");
      }
    } finally {
      setSuggesting(false);
    }
  }

  if (loadError) {
    return (
      <div className="container-app py-8">
        <div
          className="rounded-lg border border-danger-border bg-danger-soft px-4 py-3 text-[13px] text-danger"
          role="alert"
        >
          <p className="font-medium">{loadError}</p>
          <div className="mt-3 flex gap-2">
            <Button variant="ghost" size="sm" onClick={retry}>
              Try again
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => router.push(`/project/${id}/chapters`)}
            >
              Back to chapters
            </Button>
          </div>
        </div>
      </div>
    );
  }

  if (!chapter || !project) {
    return (
      <div className="container-app py-8">
        <LoadingState label="Loading chapter…" />
      </div>
    );
  }

  const looksUntitled = /^chapter\s+\d+$/i.test(title.trim()) || !title.trim();
  const wordCount = content.trim() ? content.trim().split(/\s+/).length : 0;
  const targetWords = 3000;

  const sortedChapters = [...project.chapters].sort((a, b) => a.index - b.index);
  const posInList = sortedChapters.findIndex((c) => c.id === chapter.id);
  const prevChapter = posInList > 0 ? sortedChapters[posInList - 1] : null;
  const nextChapter =
    posInList >= 0 && posInList < sortedChapters.length - 1 ? sortedChapters[posInList + 1] : null;

  const fullWindow = project.aiSettings.fullContextWindow;
  const priorChapters = sortedChapters.filter((c) => c.index < chapter.index).reverse();
  const bibleAnswers = SECTION_IDS.reduce(
    (sum, s) => sum + answeredCount(project.storyBible[s].answers),
    0
  );

  return (
    <div className="container-app py-8">
      <Button
        variant="ghost"
        size="sm"
        className="-ml-2 mb-4 text-ink-muted hover:text-ink"
        onClick={() => router.push(`/project/${id}/chapters`)}
      >
        <ArrowLeft className="h-3.5 w-3.5" aria-hidden />
        All chapters
      </Button>

      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="min-w-0 flex-1">
          <Kicker className="mb-1.5">
            Chapter {chapter.index} of {project.chapters.length}
          </Kicker>
          <label htmlFor="chapter-title" className="sr-only">
            Chapter title
          </label>
          <input
            id="chapter-title"
            className="disp w-full min-w-0 border-none bg-transparent p-0 text-[clamp(22px,4vw,28px)] text-ink focus:outline-none disabled:text-ink-muted"
            value={title}
            disabled={locked}
            onChange={(e) => setTitle(e.target.value)}
            onBlur={() => saveField({ title })}
          />
          {looksUntitled && !locked ? (
            <Button
              variant="ghost"
              size="sm"
              className="-ml-2 mt-1 text-ink-subtle hover:text-ink"
              onClick={suggestTitle}
              loading={suggesting}
            >
              <Sparkles className="h-3.5 w-3.5" aria-hidden />
              Suggest a title
            </Button>
          ) : null}
          <span className="mt-1.5 block text-xs text-ink-subtle" aria-live="polite">
            {saveStatus === "saving"
              ? "Saving…"
              : saveStatus === "saved"
              ? "Saved"
              : dirty
              ? "Unsaved changes"
              : ""}
          </span>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Badge tone={STATUS_TONE[chapter.status]}>{STATUS_LABEL[chapter.status]}</Badge>
          <Button
            variant="secondary"
            size="sm"
            onClick={toggleLock}
            aria-label={locked ? "Unlock chapter" : "Lock chapter"}
          >
            {locked ? (
              <Lock className="h-3.5 w-3.5" aria-hidden />
            ) : (
              <LockOpen className="h-3.5 w-3.5" aria-hidden />
            )}
            {locked ? "Unlock" : "Lock"}
          </Button>
          {generating && (
            <Button variant="secondary" size="sm" onClick={stopGenerating}>
              <Ban className="h-3.5 w-3.5" aria-hidden />
              Stop
            </Button>
          )}
          <Button size="sm" onClick={generate} loading={generating} disabled={locked}>
            {generating ? "Writing…" : chapter.content ? "Regenerate" : "Generate chapter"}
          </Button>
        </div>
      </div>

      {locked && (
        <div className="mt-4 flex flex-wrap items-center justify-between gap-2 rounded-lg border border-warning-border bg-warning-soft px-4 py-2.5 text-[13px] text-warning">
          <span className="flex items-center gap-2">
            <Lock className="h-3.5 w-3.5 shrink-0" aria-hidden />
            This chapter is locked &mdash; earlier changes here won&rsquo;t ripple into
            later chapters by accident.
          </span>
          <Button variant="ghost" size="sm" onClick={toggleLock} className="text-warning hover:text-warning">
            Unlock
          </Button>
        </div>
      )}

      <Panel className="mt-6 lg:flex">
        {/* Left: idea, grounding, drafting progress, status */}
        <div className="border-b border-hair px-4 py-5 lg:w-[300px] lg:shrink-0 lg:border-b-0 lg:border-r lg:border-line lg:px-5">
          <Field label="Your idea for this chapter" htmlFor="chapter-idea" className="mb-5">
            <Textarea
              id="chapter-idea"
              rows={5}
              disabled={locked}
              placeholder="What must happen in this chapter? Be as specific or as loose as you like — or skip this and just write the chapter yourself below."
              value={idea}
              onChange={(e) => setIdea(e.target.value)}
              onBlur={() => saveField({ idea })}
            />
          </Field>

          <Lbl className="mb-1.5 block">Grounded in</Lbl>
          <div className="mb-5">
            <div className="flex items-center justify-between border-b border-hair py-2 text-[13px]">
              <span className="truncate pr-3">
                Story bible <span className="text-ink-subtle">· {bibleAnswers} answers</span>
              </span>
              <span className="shrink-0 text-xs font-medium text-ink-subtle">FULL</span>
            </div>
            {priorChapters.map((c, i) => (
              <div
                key={c.id}
                className={cn(
                  "flex items-center justify-between py-2 text-[13px] text-ink-muted",
                  i < priorChapters.length - 1 && "border-b border-hair"
                )}
              >
                <span className="truncate pr-3">
                  Ch. {String(c.index).padStart(2, "0")} {c.title || "Untitled"}
                </span>
                <span className="shrink-0 text-xs font-medium text-ink-subtle">
                  {i < fullWindow ? "FULL" : "ROLLED"}
                </span>
              </div>
            ))}
          </div>

          {generating && (
            <div className="mb-5">
              <Lbl className="mb-1.5 block">Drafting</Lbl>
              <Ticks value={Math.min(1, wordCount / targetWords)} />
              <p className="mt-2 text-xs text-ink-muted">
                {wordCount.toLocaleString()} / {targetWords.toLocaleString()} words · streaming
              </p>
            </div>
          )}

          <div className="space-y-3 border-t border-hair pt-4">
            <div>
              <Lbl className="mb-1 block">Status</Lbl>
              <Badge tone={STATUS_TONE[chapter.status]}>{STATUS_LABEL[chapter.status]}</Badge>
            </div>
            <div>
              <Lbl className="mb-1 block">Lock</Lbl>
              <p className="text-xs text-ink-muted">
                {locked
                  ? "Locked — text, regeneration and deletion are frozen."
                  : "Open — locking freezes text, regeneration and deletion."}
              </p>
            </div>
          </div>
        </div>

        {/* Right: chapter text */}
        <div className="flex flex-1 flex-col px-4 py-5 lg:min-w-0 lg:px-5">
          <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <Lbl id="chapter-text-label">Chapter text</Lbl>
              <div
                role="tablist"
                aria-labelledby="chapter-text-label"
                className="inline-flex items-center gap-0.5 rounded-lg border border-line bg-surface-2 p-0.5"
              >
                <button
                  role="tab"
                  id="tab-edit"
                  aria-selected={tab === "edit"}
                  aria-controls="panel-edit"
                  onClick={() => setTab("edit")}
                  className={cn(
                    "rounded-[6px] px-2.5 py-1 text-[13px] transition-colors",
                    tab === "edit"
                      ? "bg-surface font-medium text-ink shadow-xs"
                      : "text-ink-muted hover:text-ink"
                  )}
                >
                  Edit
                </button>
                <button
                  role="tab"
                  id="tab-preview"
                  aria-selected={tab === "preview"}
                  aria-controls="panel-preview"
                  onClick={() => setTab("preview")}
                  className={cn(
                    "rounded-[6px] px-2.5 py-1 text-[13px] transition-colors",
                    tab === "preview"
                      ? "bg-surface font-medium text-ink shadow-xs"
                      : "text-ink-muted hover:text-ink"
                  )}
                >
                  Preview
                </button>
              </div>
            </div>
            <span className="tnum text-xs text-ink-muted" aria-live="polite">
              {generating
                ? "Generating…"
                : `${wordCount.toLocaleString()} words${
                    saveStatus === "saved" ? " · saved" : ""
                  }`}
            </span>
          </div>

          {tab === "edit" ? (
            <div id="panel-edit" role="tabpanel" aria-labelledby="tab-edit">
              <label htmlFor="chapter-content" className="sr-only">
                Chapter text
              </label>
              <Textarea
                id="chapter-content"
                ref={contentRef}
                className="h-[55vh] resize-none text-[15px] leading-relaxed"
                value={content}
                disabled={locked}
                onChange={(e) => setContent(e.target.value)}
                onBlur={() => saveField({ content })}
                placeholder="Generated (or hand-written) prose will appear here — fully editable. If you already have this chapter written, just paste it in."
              />
            </div>
          ) : (
            <div
              id="panel-preview"
              role="tabpanel"
              aria-labelledby="tab-preview"
              className="prose-manuscript h-[55vh] max-w-none overflow-y-auto rounded-lg border border-line bg-surface-2 p-5"
            >
              {content.trim() ? (
                content.split(/\n{2,}/).map((para, i, arr) => (
                  <p key={i} className="whitespace-pre-wrap">
                    {para}
                    {generating && i === arr.length - 1 && <span className="caret" />}
                  </p>
                ))
              ) : (
                <p className="text-ink-subtle">Nothing to preview yet.</p>
              )}
            </div>
          )}

          <div className="mt-5 flex flex-wrap items-center justify-between gap-3 border-t border-hair pt-4">
            <div className="flex flex-wrap items-center gap-2 text-xs text-ink-muted">
              {prevChapter ? (
                <button
                  onClick={() => router.push(`/project/${id}/chapters/${prevChapter.id}`)}
                  className="flex items-center gap-1 transition-colors hover:text-ink"
                >
                  <ChevronLeft className="h-3.5 w-3.5" aria-hidden />
                  Ch. {String(prevChapter.index).padStart(2, "0")} previous
                </button>
              ) : (
                <span />
              )}
              {prevChapter && nextChapter && <span>·</span>}
              {nextChapter && (
                <button
                  onClick={() => router.push(`/project/${id}/chapters/${nextChapter.id}`)}
                  className="flex items-center gap-1 transition-colors hover:text-ink"
                >
                  Next ch. {String(nextChapter.index).padStart(2, "0")}
                  <ChevronRight className="h-3.5 w-3.5" aria-hidden />
                </button>
              )}
            </div>
            {generating ? (
              <Button variant="ghost" size="sm" onClick={stopGenerating}>
                Stop generating
              </Button>
            ) : (
              <Button
                variant="secondary"
                size="sm"
                disabled={locked}
                onClick={() => saveField({ content, status: "final" })}
              >
                Mark as final
              </Button>
            )}
          </div>
        </div>
      </Panel>

      <div className="mt-5 flex flex-wrap items-center gap-2 text-xs text-ink-subtle">
        <span className="flex items-center gap-1">
          <Download className="h-3.5 w-3.5" aria-hidden />
          Export:
        </span>
        {(["md", "pdf", "epub"] as const).map((fmt) => (
          <a
            key={fmt}
            href={`/api/projects/${id}/chapters/${chapterId}/export?format=${fmt}`}
            className="rounded-md border border-line px-2.5 py-1 text-ink-muted transition-colors hover:border-line-strong hover:text-ink"
          >
            .{fmt}
          </a>
        ))}
      </div>
    </div>
  );
}
