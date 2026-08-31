"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { toast } from "sonner";
import {
  ArrowLeft,
  Ban,
  Download,
  Lock,
  LockOpen,
  Sparkles,
} from "lucide-react";
import { api, ApiError } from "@/lib/api";
import { Chapter } from "@/lib/types";
import {
  Button,
  Card,
  Field,
  LoadingState,
  Textarea,
} from "@/components/ui";

type SaveStatus = "idle" | "saving" | "saved";
type TabId = "edit" | "preview";

export default function ChapterWorkspacePage() {
  const { id, chapterId } = useParams<{ id: string; chapterId: string }>();
  const router = useRouter();
  const [chapter, setChapter] = useState<Chapter | null>(null);
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

  const loadChapter = useCallback(() => {
    api
      .getProject(id)
      .then((p) => {
        const c = p.chapters.find((ch) => ch.id === chapterId);
        if (c) {
          setChapter(c);
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
      setChapter(updated);
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
      setChapter(updated);
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
      <div className="mx-auto w-full max-w-3xl px-4 py-10 sm:px-6">
        <Card className="border-danger/30 bg-danger-soft p-5 text-sm text-danger" role="alert">
          <p className="font-medium">{loadError}</p>
          <div className="mt-2 flex gap-2">
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
        </Card>
      </div>
    );
  }

  if (!chapter) {
    return (
      <div className="mx-auto w-full max-w-3xl px-4 py-10 sm:px-6">
        <LoadingState label="Loading chapter…" />
      </div>
    );
  }

  const looksUntitled = /^chapter\s+\d+$/i.test(title.trim()) || !title.trim();
  const wordCount = content.trim() ? content.trim().split(/\s+/).length : 0;

  return (
    <div className="mx-auto flex w-full max-w-3xl flex-col px-4 py-10 sm:px-6">
      <Button
        variant="ghost"
        size="sm"
        className="mb-4 w-fit px-0 text-ink-muted hover:bg-transparent hover:text-ink"
        onClick={() => router.push(`/project/${id}/chapters`)}
      >
        <ArrowLeft className="h-3.5 w-3.5" aria-hidden />
        All chapters
      </Button>

      {locked && (
        <div className="mb-4 flex flex-wrap items-center justify-between gap-2 rounded-xl border border-warning/30 bg-warning-soft px-4 py-2.5 text-sm text-warning">
          <span className="flex items-center gap-2">
            <Lock className="h-4 w-4 shrink-0" aria-hidden />
            This chapter is locked &mdash; earlier changes here won&rsquo;t ripple into
            later chapters by accident.
          </span>
          <Button variant="ghost" size="sm" onClick={toggleLock} className="text-warning hover:text-warning">
            Unlock
          </Button>
        </div>
      )}

      <div className="mb-1 flex items-center justify-between gap-2">
        <label htmlFor="chapter-title" className="sr-only">
          Chapter title
        </label>
        <input
          id="chapter-title"
          className="flex-1 border-none bg-transparent text-2xl font-semibold text-ink focus:outline-none disabled:text-ink-muted"
          value={title}
          disabled={locked}
          onChange={(e) => setTitle(e.target.value)}
          onBlur={() => saveField({ title })}
        />
        <Button
          variant="ghost"
          size="icon"
          aria-label={locked ? "Unlock chapter" : "Lock chapter"}
          title={locked ? "Unlock chapter" : "Lock chapter"}
          onClick={toggleLock}
        >
          {locked ? <Lock className="h-4 w-4" aria-hidden /> : <LockOpen className="h-4 w-4" aria-hidden />}
        </Button>
      </div>
      <div className="mb-4 flex items-center justify-between gap-2">
        {looksUntitled && !locked ? (
          <Button
            variant="ghost"
            size="sm"
            className="px-0 text-ink-subtle hover:bg-transparent hover:text-ink"
            onClick={suggestTitle}
            loading={suggesting}
          >
            <Sparkles className="h-3.5 w-3.5" aria-hidden />
            Suggest a title
          </Button>
        ) : (
          <span />
        )}
        <span className="text-xs text-ink-subtle" aria-live="polite">
          {saveStatus === "saving"
            ? "Saving…"
            : saveStatus === "saved"
            ? "Saved"
            : dirty
            ? "Unsaved changes"
            : ""}
        </span>
      </div>

      <Card className="mb-6 p-5">
        <Field label="Your idea for this chapter" htmlFor="chapter-idea">
          <Textarea
            id="chapter-idea"
            rows={3}
            disabled={locked}
            placeholder="What must happen in this chapter? Be as specific or as loose as you like — or skip this and just write the chapter yourself below."
            value={idea}
            onChange={(e) => setIdea(e.target.value)}
            onBlur={() => saveField({ idea })}
          />
        </Field>
        <div className="mt-3 flex flex-wrap items-center justify-between gap-2">
          <p className="text-xs text-ink-subtle">
            Inkdrop uses your story bible, the hidden story-so-far summary, and recent
            chapters as context.
          </p>
          <div className="flex items-center gap-2">
            {generating && (
              <Button variant="secondary" size="sm" onClick={stopGenerating}>
                <Ban className="h-3.5 w-3.5" aria-hidden />
                Stop
              </Button>
            )}
            <Button onClick={generate} loading={generating} disabled={locked}>
              {generating
                ? "Writing…"
                : chapter.content
                ? "Regenerate chapter"
                : "Generate chapter"}
            </Button>
          </div>
        </div>
      </Card>

      <Card className="flex flex-1 flex-col p-5">
        <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
          <div className="flex items-center gap-3">
            <span id="chapter-text-label" className="text-sm font-medium text-ink">
              Chapter text
            </span>
            <div className="flex rounded-lg border border-line p-0.5" role="tablist" aria-labelledby="chapter-text-label">
              <button
                role="tab"
                id="tab-edit"
                aria-selected={tab === "edit"}
                aria-controls="panel-edit"
                onClick={() => setTab("edit")}
                className={`rounded-md px-2.5 py-0.5 text-xs transition-colors ${
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
                className={`rounded-md px-2.5 py-0.5 text-xs transition-colors ${
                  tab === "preview" ? "bg-accent text-accent-ink" : "text-ink-muted hover:text-ink"
                }`}
              >
                Preview
              </button>
            </div>
          </div>
          <span className="text-xs text-ink-subtle" aria-live="polite">
            {generating ? "Generating…" : `${wordCount} words`}
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
            className="prose-manuscript h-[60vh] max-w-none overflow-y-auto rounded-lg border border-line bg-surface-2/50 p-6"
          >
            {content.trim() ? (
              content
                .split(/\n{2,}/)
                .map((para, i) => (
                  <p key={i} className="whitespace-pre-wrap">
                    {para}
                  </p>
                ))
            ) : (
              <p className="text-ink-subtle">Nothing to preview yet.</p>
            )}
          </div>
        )}
      </Card>

      <div className="mt-4 flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-2 text-xs">
          <span className="flex items-center gap-1 text-ink-subtle">
            <Download className="h-3.5 w-3.5" aria-hidden />
            Export this chapter:
          </span>
          {(["md", "pdf", "epub"] as const).map((fmt) => (
            <a
              key={fmt}
              href={`/api/projects/${id}/chapters/${chapterId}/export?format=${fmt}`}
              className="rounded-lg border border-line px-3 py-1.5 text-ink-muted transition-colors hover:border-line-strong hover:text-ink"
            >
              .{fmt}
            </a>
          ))}
        </div>
        <Button
          variant="secondary"
          disabled={locked}
          onClick={() => saveField({ content, status: "final" })}
        >
          Mark as final
        </Button>
      </div>
    </div>
  );
}
