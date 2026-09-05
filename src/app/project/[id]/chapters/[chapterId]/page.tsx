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
  Textarea,
  Ticks,
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
    setContent("");
    // persist the idea/title first so the prompt builder sees the latest idea
    try {
      await api.updateChapter(id, chapterId, { idea, title });
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
      <div className="px-4 py-10 sm:px-10">
        <div className="border-l-2 border-danger bg-danger-soft px-5 py-4 text-sm text-danger-ink" role="alert">
          <p className="font-semibold">{loadError}</p>
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
      <div className="px-4 py-10 sm:px-10">
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
    <div className="flex w-full flex-col px-4 py-10 sm:px-10">
      <Button
        variant="ghost"
        size="sm"
        className="mb-6 w-fit px-0 text-ink-muted hover:bg-transparent hover:text-ink"
        onClick={() => router.push(`/project/${id}/chapters`)}
      >
        <ArrowLeft className="h-3.5 w-3.5" aria-hidden />
        All chapters
      </Button>

      <div className="flex flex-wrap items-end justify-between gap-4">
        <div className="min-w-0">
          <Kicker className="mb-3">
            Chapter {chapter.index} of {project.chapters.length}
          </Kicker>
          <div className="flex items-center gap-2">
            <label htmlFor="chapter-title" className="sr-only">
              Chapter title
            </label>
            <input
              id="chapter-title"
              className="disp min-w-0 flex-1 border-none bg-transparent text-[clamp(28px,5vw,44px)] text-ink focus:outline-none disabled:text-ink-muted"
              value={title}
              disabled={locked}
              onChange={(e) => setTitle(e.target.value)}
              onBlur={() => saveField({ title })}
            />
          </div>
          {looksUntitled && !locked ? (
            <Button
              variant="ghost"
              size="sm"
              className="mt-2 px-0 text-ink-subtle hover:bg-transparent hover:text-ink"
              onClick={suggestTitle}
              loading={suggesting}
            >
              <Sparkles className="h-3.5 w-3.5" aria-hidden />
              Suggest a title
            </Button>
          ) : null}
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Badge tone={STATUS_TONE[chapter.status]}>{STATUS_LABEL[chapter.status]}</Badge>
          <Button
            variant="secondary"
            size="sm"
            onClick={toggleLock}
            aria-label={locked ? "Unlock chapter" : "Lock chapter"}
          >
            {locked ? <Lock className="h-3.5 w-3.5" aria-hidden /> : <LockOpen className="h-3.5 w-3.5" aria-hidden />}
            {locked ? "Unlock" : "Lock chapter"}
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

      <span className="mt-3 block text-xs text-ink-subtle" aria-live="polite">
        {saveStatus === "saving"
          ? "Saving…"
          : saveStatus === "saved"
          ? "Saved"
          : dirty
          ? "Unsaved changes"
          : ""}
      </span>

      {locked && (
        <div className="mt-5 flex flex-wrap items-center justify-between gap-2 border-l-2 border-warning bg-warning-soft px-4 py-3 text-sm text-warning-ink">
          <span className="flex items-center gap-2">
            <Lock className="h-4 w-4 shrink-0" aria-hidden />
            This chapter is locked &mdash; earlier changes here won&rsquo;t ripple into
            later chapters by accident.
          </span>
          <Button variant="ghost" size="sm" onClick={toggleLock} className="text-warning-ink hover:text-warning-ink">
            Unlock
          </Button>
        </div>
      )}

      <div className="mt-8 grid grid-cols-1 border-t-2 border-line lg:grid-cols-[340px_minmax(0,1fr)]">
        {/* Left: idea, grounding, drafting progress, status */}
        <div className="border-line bg-surface px-1 py-7 lg:w-[340px] lg:border-r-2 lg:px-8 lg:py-8">
          <Field label="Your idea for this chapter" htmlFor="chapter-idea" className="mb-7">
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

          <Kicker className="mb-3">Grounded in</Kicker>
          <div className="mono mb-7 text-sm">
            <div className="flex items-center justify-between border-b border-hair py-2.5">
              <span>Story bible · {bibleAnswers} answers</span>
              <span className="mono text-ink-muted">FULL</span>
            </div>
            {priorChapters.map((c, i) => (
              <div
                key={c.id}
                className={`flex items-center justify-between py-2.5 ${
                  i < priorChapters.length - 1 ? "border-b border-hair" : ""
                }`}
              >
                <span className="truncate pr-3">
                  Ch. {String(c.index).padStart(2, "0")} {c.title || "Untitled"}
                </span>
                <span className="mono shrink-0 text-ink-muted">
                  {i < fullWindow ? "FULL" : "ROLLED"}
                </span>
              </div>
            ))}
          </div>

          {generating && (
            <>
              <Kicker className="mb-3">Drafting</Kicker>
              <Ticks value={Math.min(1, wordCount / targetWords)} />
              <p className="mono mt-2.5 mb-6 text-ink-muted">
                {wordCount.toLocaleString()} / {targetWords.toLocaleString()} WORDS · STREAMING
              </p>
            </>
          )}

          <hr className="mb-4 h-px border-0 bg-hair" />
          <div className="space-y-3">
            <div>
              <Lbl className="mb-1 block">Status</Lbl>
              <Badge tone={STATUS_TONE[chapter.status]}>{STATUS_LABEL[chapter.status]}</Badge>
            </div>
            <div>
              <Lbl className="mb-1 block">Lock</Lbl>
              <p className="text-sm text-ink-muted">
                {locked
                  ? "Locked — text, regeneration and deletion are frozen."
                  : "Open — locking freezes text, regeneration and deletion."}
              </p>
            </div>
          </div>
        </div>

        {/* Right: chapter text */}
        <div className="flex flex-1 flex-col px-1 py-7 lg:px-8 lg:py-8">
          <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
            <div className="flex items-center gap-3">
              <span id="chapter-text-label" className="lbl">
                Chapter text — fully editable
              </span>
              <div role="tablist" aria-labelledby="chapter-text-label" className="flex border border-line">
                <button
                  role="tab"
                  id="tab-edit"
                  aria-selected={tab === "edit"}
                  aria-controls="panel-edit"
                  onClick={() => setTab("edit")}
                  className={`lbl px-3 py-1.5 transition-colors ${
                    tab === "edit" ? "bg-accent text-accent-ink" : "text-ink-muted hover:text-ink"
                  }`}
                >
                  Edit
                </button>
                <button
                  role="tab"
                  id="tab-preview"
                  aria-selected={tab === "preview"}
                  aria-controls="panel-preview"
                  onClick={() => setTab("preview")}
                  className={`lbl border-l border-line px-3 py-1.5 transition-colors ${
                    tab === "preview" ? "bg-accent text-accent-ink" : "text-ink-muted hover:text-ink"
                  }`}
                >
                  Preview
                </button>
              </div>
            </div>
            <span className="mono text-ink-muted" aria-live="polite">
              {generating
                ? "GENERATING…"
                : `${wordCount.toLocaleString()} WORDS${
                    saveStatus === "saved" ? " · SAVED" : ""
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
                className="h-[60vh] resize-none font-serif text-[15px] leading-relaxed"
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
              className="prose-manuscript h-[60vh] max-w-none overflow-y-auto border border-line bg-surface-2 p-6"
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

          <div className="mt-8 flex flex-wrap items-center justify-between gap-3 border-t-2 border-line pt-5">
            <div className="mono flex flex-wrap items-center gap-2 text-ink-muted">
              {prevChapter ? (
                <button
                  onClick={() => router.push(`/project/${id}/chapters/${prevChapter.id}`)}
                  className="flex items-center gap-1 transition-colors hover:text-ink"
                >
                  <ChevronLeft className="h-3.5 w-3.5" aria-hidden />
                  CH. {String(prevChapter.index).padStart(2, "0")} PREVIOUS
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
                  NEXT CH. {String(nextChapter.index).padStart(2, "0")}
                  <ChevronRight className="h-3.5 w-3.5" aria-hidden />
                </button>
              )}
            </div>
            {generating ? (
              <Button variant="ghost" size="sm" onClick={stopGenerating}>
                Stop generating
              </Button>
            ) : (
              <Button variant="secondary" size="sm" disabled={locked} onClick={() => saveField({ content, status: "final" })}>
                Mark as final
              </Button>
            )}
          </div>
        </div>
      </div>

      <div className="mt-6 flex flex-wrap items-center gap-2 text-xs">
        <span className="flex items-center gap-1 text-ink-subtle">
          <Download className="h-3.5 w-3.5" aria-hidden />
          Export this chapter:
        </span>
        {(["md", "pdf", "epub"] as const).map((fmt) => (
          <a
            key={fmt}
            href={`/api/projects/${id}/chapters/${chapterId}/export?format=${fmt}`}
            className="border border-line px-3 py-1.5 text-ink-muted transition-colors hover:border-line-strong hover:text-ink"
          >
            .{fmt}
          </a>
        ))}
      </div>
    </div>
  );
}
