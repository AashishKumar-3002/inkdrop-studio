"use client";

import { useCallback, useEffect, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { toast } from "sonner";
import { ArrowLeft, Sparkles, Wand2, X } from "lucide-react";
import { api, ApiError } from "@/lib/api";
import { BookMeta, ClientProject } from "@/lib/types";
import {
  Badge,
  Button,
  Card,
  CardHeader,
  ErrorState,
  Field,
  Input,
  Select,
  Skeleton,
  Textarea,
} from "@/components/ui";

type SaveStatus = "idle" | "saving" | "saved";
type ExportFormat = "epub" | "pdf" | "md";

export default function BookPage() {
  const { id } = useParams<{ id: string }>();
  const [project, setProject] = useState<ClientProject | null>(null);
  const [book, setBook] = useState<BookMeta | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [status, setStatus] = useState<SaveStatus>("idle");

  const [vision, setVision] = useState("");
  const [directions, setDirections] = useState<string[]>([]);
  const [chosenPrompt, setChosenPrompt] = useState("");
  const [suggesting, setSuggesting] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [coverError, setCoverError] = useState<string | null>(null);

  const [exportFormat, setExportFormat] = useState<ExportFormat>("epub");
  const [onlyFinal, setOnlyFinal] = useState(false);

  const load = useCallback(() => {
    setLoadError(null);
    setProject(null);
    api
      .getProject(id)
      .then((p) => {
        setProject(p);
        setBook(p.book);
      })
      .catch((e: unknown) =>
        setLoadError(e instanceof Error ? e.message : "Couldn't load this book.")
      );
  }, [id]);

  useEffect(() => {
    // Initial data fetch on mount / id change — load() manages its own
    // loading/error state, there is no way to defer that off the effect.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    load();
  }, [load]);

  async function saveBook(patch: Partial<BookMeta>) {
    if (!book) return;
    const previous = book;
    setBook({ ...book, ...patch });
    setStatus("saving");
    try {
      const updated = await api.saveBook(id, patch);
      setProject(updated);
      setBook(updated.book);
      setStatus("saved");
      setTimeout(() => setStatus("idle"), 1000);
    } catch (e) {
      setBook(previous);
      setStatus("idle");
      toast.error(e instanceof ApiError ? e.message : "Couldn't save that change.");
    }
  }

  async function getSuggestions() {
    setSuggesting(true);
    setCoverError(null);
    try {
      const { directions } = await api.suggestCoverDirections(id, vision);
      setDirections(directions);
    } catch (e) {
      const message =
        e instanceof ApiError ? e.message : "Couldn't get cover suggestions.";
      setCoverError(message);
      toast.error(message);
    } finally {
      setSuggesting(false);
    }
  }

  async function generateCover(prompt: string) {
    setGenerating(true);
    setCoverError(null);
    try {
      const { imageDataUrl } = await api.generateCover(id, prompt);
      await saveBook({ coverImageDataUrl: imageDataUrl });
      toast.success("Cover generated.");
    } catch (e) {
      const message = e instanceof ApiError ? e.message : "Couldn't generate a cover image.";
      setCoverError(message);
      toast.error(message);
    } finally {
      setGenerating(false);
    }
  }

  if (loadError) {
    return (
      <div className="mx-auto w-full max-w-3xl px-6 py-10">
        <ErrorState message={loadError} onRetry={load} />
      </div>
    );
  }

  if (!project || !book) {
    return (
      <div className="mx-auto w-full max-w-3xl space-y-6 px-6 py-10">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-52" />
        <Skeleton className="h-96" />
        <Skeleton className="h-40" />
      </div>
    );
  }

  const readyToExport = project.chapters.some((c) => c.content.trim());
  const missingTitle = !book.title.trim();
  const needsImageKey = !project.imageSettings.hasApiKey;

  return (
    <div className="mx-auto w-full max-w-3xl px-6 py-10">
      <div className="mb-6 flex items-center justify-between gap-3">
        <div>
          <Link
            href="/dashboard"
            className="mb-2 inline-flex items-center gap-1 text-xs text-ink-muted hover:text-ink"
          >
            <ArrowLeft className="h-3.5 w-3.5" />
            Dashboard
          </Link>
          <h1 className="text-2xl font-semibold tracking-tight text-ink">
            Book &amp; Cover
          </h1>
        </div>
        <span className="text-xs text-ink-subtle" role="status" aria-live="polite">
          {status === "saving" ? "Saving…" : status === "saved" ? "Saved" : ""}
        </span>
      </div>

      <div className="space-y-6">
        <Card>
          <CardHeader title="Title page" description="What appears on the cover and title page." />
          <div className="space-y-4 p-5">
            <Field label="Book title" htmlFor="book-title" required={missingTitle}>
              <Input
                id="book-title"
                placeholder={project.name}
                defaultValue={book.title}
                onBlur={(e) => saveBook({ title: e.target.value })}
              />
            </Field>
            <Field label="Subtitle" htmlFor="book-subtitle">
              <Input
                id="book-subtitle"
                defaultValue={book.subtitle}
                onBlur={(e) => saveBook({ subtitle: e.target.value })}
              />
            </Field>
            <Field label="Author" htmlFor="book-author">
              <Input
                id="book-author"
                defaultValue={book.author}
                onBlur={(e) => saveBook({ author: e.target.value })}
              />
            </Field>
          </div>
        </Card>

        <Card>
          <CardHeader
            title="Cover Studio"
            description="Describe a vision, get directions, generate an image."
          />
          <div className="space-y-5 p-5">
            {book.coverImageDataUrl ? (
              <div className="flex flex-col gap-4 sm:flex-row">
                {/* A generated data: URL — next/image can't optimize that anyway. */}
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={book.coverImageDataUrl}
                  alt={`Cover art for ${book.title || project.name}`}
                  className="h-56 w-auto max-w-full rounded-lg border border-line object-cover shadow-card"
                />
                <div className="flex flex-col justify-between gap-2 text-xs text-ink-muted">
                  <p>This is set as your book&rsquo;s cover.</p>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="w-fit text-danger hover:text-danger"
                    onClick={() => saveBook({ coverImageDataUrl: "" })}
                  >
                    <X className="h-3.5 w-3.5" />
                    Remove cover
                  </Button>
                </div>
              </div>
            ) : (
              <p className="text-sm text-ink-subtle">No cover set yet.</p>
            )}

            {needsImageKey && (
              <p className="rounded-lg border border-warning/30 bg-warning-soft px-3 py-2 text-xs text-warning">
                No OpenAI key configured for image generation yet. Add one under{" "}
                <Link href={`/project/${id}/settings`} className="underline">
                  Settings &rarr; Cover art / image generation
                </Link>{" "}
                before generating a cover.
              </p>
            )}

            <Field
              label="Describe your vision for the cover"
              htmlFor="cover-vision"
            >
              <Textarea
                id="cover-vision"
                rows={2}
                placeholder="e.g. moody, a single figure walking away from a burning house, cold blues... or leave blank and let Inkdrop suggest directions from your story."
                value={vision}
                onChange={(e) => setVision(e.target.value)}
              />
              <Button
                variant="secondary"
                size="sm"
                className="mt-2"
                onClick={getSuggestions}
                loading={suggesting}
              >
                <Sparkles className="h-4 w-4" />
                Get cover direction recommendations
              </Button>
            </Field>

            {directions.length > 0 && (
              <div className="space-y-2" role="radiogroup" aria-label="Cover directions">
                {directions.map((d, i) => (
                  <button
                    key={i}
                    type="button"
                    role="radio"
                    aria-checked={chosenPrompt === d}
                    onClick={() => setChosenPrompt(d)}
                    className={
                      "block w-full rounded-lg border p-3 text-left text-sm transition-colors " +
                      (chosenPrompt === d
                        ? "border-accent bg-accent-soft text-ink"
                        : "border-line bg-surface text-ink-muted hover:border-line-strong hover:text-ink")
                    }
                  >
                    {d}
                  </button>
                ))}
              </div>
            )}

            <Field
              label="Final image prompt"
              htmlFor="cover-prompt"
              hint="Uses the image provider configured in Settings (OpenAI Images today &mdash; Claude doesn&rsquo;t generate images). Generating an image can take about 30 seconds."
            >
              <Textarea
                id="cover-prompt"
                rows={3}
                placeholder="Pick a direction above, or write your own final prompt for the image model."
                value={chosenPrompt}
                onChange={(e) => setChosenPrompt(e.target.value)}
              />
              <Button
                className="mt-2"
                onClick={() => generateCover(chosenPrompt)}
                disabled={!chosenPrompt.trim() || needsImageKey}
                loading={generating}
              >
                <Wand2 className="h-4 w-4" />
                {generating ? "Generating (about 30s)…" : "Generate cover image"}
              </Button>
            </Field>

            {coverError && (
              <p className="text-sm text-danger" role="alert">
                {coverError}
              </p>
            )}
          </div>
        </Card>

        <Card>
          <CardHeader
            title="Export the full book"
            description="Download a compiled manuscript with your title page and cover."
          />
          <div className="space-y-3 p-5">
            {!readyToExport ? (
              <p className="text-sm text-ink-subtle">
                Write or generate at least one chapter before exporting.
              </p>
            ) : (
              <>
                {missingTitle && (
                  <p className="rounded-lg border border-warning/30 bg-warning-soft px-3 py-2 text-sm text-warning">
                    No book title set yet &mdash; the project name (&ldquo;{project.name}
                    &rdquo;) will be used instead. Set a title above for a proper cover
                    page.
                  </p>
                )}
                {!book.coverImageDataUrl && (
                  <p className="text-sm text-ink-subtle">
                    No cover set &mdash; the export will not include one. Use Cover
                    Studio above to generate one first, if you&rsquo;d like.
                  </p>
                )}
                <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:flex-wrap">
                  <Select
                    aria-label="Export format"
                    className="w-full sm:w-auto"
                    value={exportFormat}
                    onChange={(e) => setExportFormat(e.target.value as ExportFormat)}
                  >
                    <option value="epub">EPUB</option>
                    <option value="pdf">PDF</option>
                    <option value="md">Markdown</option>
                  </Select>
                  <label className="flex items-center gap-1.5 text-sm text-ink-muted">
                    <input
                      type="checkbox"
                      checked={onlyFinal}
                      onChange={(e) => setOnlyFinal(e.target.checked)}
                    />
                    Only include chapters marked Final
                  </label>
                  <a
                    href={`/api/projects/${id}/book/export?format=${exportFormat}&onlyFinal=${onlyFinal ? "1" : "0"}`}
                    className="inline-flex h-10 items-center justify-center gap-2 rounded-lg bg-accent px-4 text-sm font-medium text-accent-ink shadow-card hover:bg-accent-hover"
                  >
                    Export book
                  </a>
                  {onlyFinal && (
                    <Badge tone="accent" className="w-fit">
                      Final chapters only
                    </Badge>
                  )}
                </div>
              </>
            )}
          </div>
        </Card>
      </div>
    </div>
  );
}
