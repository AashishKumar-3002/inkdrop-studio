"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { api } from "@/lib/api";
import { BookMeta, Project } from "@/lib/types";

export default function BookPage() {
  const { id } = useParams<{ id: string }>();
  const [project, setProject] = useState<Project | null>(null);
  const [book, setBook] = useState<BookMeta | null>(null);
  const [status, setStatus] = useState<"idle" | "saving" | "saved">("idle");

  const [vision, setVision] = useState("");
  const [directions, setDirections] = useState<string[]>([]);
  const [chosenPrompt, setChosenPrompt] = useState("");
  const [suggesting, setSuggesting] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [exportFormat, setExportFormat] = useState<"epub" | "pdf" | "md">("epub");
  const [onlyFinal, setOnlyFinal] = useState(false);

  useEffect(() => {
    api.getProject(id).then((p) => {
      setProject(p);
      setBook(p.book);
    });
  }, [id]);

  async function saveBook(patch: Partial<BookMeta>) {
    if (!book) return;
    const next = { ...book, ...patch };
    setBook(next);
    setStatus("saving");
    await api.saveBook(id, patch);
    setStatus("saved");
    setTimeout(() => setStatus("idle"), 1000);
  }

  async function getSuggestions() {
    setSuggesting(true);
    setError(null);
    try {
      const { directions } = await api.suggestCoverDirections(id, vision);
      setDirections(directions);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Couldn't get cover suggestions.");
    } finally {
      setSuggesting(false);
    }
  }

  async function generateCover(prompt: string) {
    setGenerating(true);
    setError(null);
    try {
      const { imageDataUrl } = await api.generateCover(id, prompt);
      await saveBook({ coverImageDataUrl: imageDataUrl });
    } catch (e) {
      setError(e instanceof Error ? e.message : "Couldn't generate a cover image.");
    } finally {
      setGenerating(false);
    }
  }

  if (!project || !book) {
    return <div className="p-16 text-center text-neutral-400">Loading...</div>;
  }

  const readyToExport = project.chapters.some((c) => c.content.trim());
  const missingTitle = !book.title.trim();

  return (
    <div className="mx-auto w-full max-w-3xl px-6 py-10">
      <div className="mb-6 flex items-center justify-between">
        <h1 className="text-2xl font-semibold text-neutral-900">Book & Cover</h1>
        <span className="text-xs text-neutral-400">
          {status === "saving" ? "Saving..." : status === "saved" ? "Saved" : ""}
        </span>
      </div>

      <div className="mb-6 space-y-4 rounded-2xl border border-neutral-200 bg-white p-6 shadow-sm">
        <h2 className="text-sm font-medium uppercase tracking-wide text-neutral-500">
          Title page
        </h2>
        <div>
          <label className="mb-1 block text-sm font-medium text-neutral-700">
            Book title {missingTitle && <span className="text-red-500">*</span>}
          </label>
          <input
            className="w-full rounded-xl border border-neutral-300 p-2.5 text-sm focus:border-neutral-900 focus:outline-none"
            placeholder={project.name}
            defaultValue={book.title}
            onBlur={(e) => saveBook({ title: e.target.value })}
          />
        </div>
        <div>
          <label className="mb-1 block text-sm font-medium text-neutral-700">Subtitle</label>
          <input
            className="w-full rounded-xl border border-neutral-300 p-2.5 text-sm focus:border-neutral-900 focus:outline-none"
            defaultValue={book.subtitle}
            onBlur={(e) => saveBook({ subtitle: e.target.value })}
          />
        </div>
        <div>
          <label className="mb-1 block text-sm font-medium text-neutral-700">Author</label>
          <input
            className="w-full rounded-xl border border-neutral-300 p-2.5 text-sm focus:border-neutral-900 focus:outline-none"
            defaultValue={book.author}
            onBlur={(e) => saveBook({ author: e.target.value })}
          />
        </div>
      </div>

      <div className="mb-6 space-y-4 rounded-2xl border border-neutral-200 bg-white p-6 shadow-sm">
        <h2 className="text-sm font-medium uppercase tracking-wide text-neutral-500">
          Cover Studio
        </h2>

        {book.coverImageDataUrl ? (
          <div className="flex gap-4">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={book.coverImageDataUrl}
              alt="Book cover"
              className="h-56 w-auto rounded-lg border border-neutral-200 shadow-sm"
            />
            <div className="flex flex-col justify-between text-xs text-neutral-500">
              <p>This is set as your book&rsquo;s cover.</p>
              <button
                onClick={() => saveBook({ coverImageDataUrl: "" })}
                className="w-fit text-red-500 underline"
              >
                Remove cover
              </button>
            </div>
          </div>
        ) : (
          <p className="text-sm text-neutral-400">No cover set yet.</p>
        )}

        <div>
          <label className="mb-1 block text-sm font-medium text-neutral-700">
            Describe your vision for the cover
          </label>
          <textarea
            className="w-full rounded-xl border border-neutral-300 p-3 text-sm focus:border-neutral-900 focus:outline-none"
            rows={2}
            placeholder="e.g. moody, a single figure walking away from a burning house, cold blues... or leave blank and let Inkdrop suggest directions from your story."
            value={vision}
            onChange={(e) => setVision(e.target.value)}
          />
          <button
            onClick={getSuggestions}
            disabled={suggesting}
            className="mt-2 rounded-xl border border-neutral-300 px-4 py-2 text-sm text-neutral-700 hover:border-neutral-500 disabled:opacity-50"
          >
            {suggesting ? "Thinking..." : "Get cover direction recommendations"}
          </button>
        </div>

        {directions.length > 0 && (
          <div className="space-y-2">
            {directions.map((d, i) => (
              <div
                key={i}
                className={`cursor-pointer rounded-xl border p-3 text-sm ${
                  chosenPrompt === d
                    ? "border-neutral-900 bg-neutral-50"
                    : "border-neutral-200 hover:border-neutral-400"
                }`}
                onClick={() => setChosenPrompt(d)}
              >
                {d}
              </div>
            ))}
          </div>
        )}

        <div>
          <label className="mb-1 block text-sm font-medium text-neutral-700">
            Final image prompt
          </label>
          <textarea
            className="w-full rounded-xl border border-neutral-300 p-3 text-sm focus:border-neutral-900 focus:outline-none"
            rows={3}
            placeholder="Pick a direction above, or write your own final prompt for the image model."
            value={chosenPrompt}
            onChange={(e) => setChosenPrompt(e.target.value)}
          />
          <button
            onClick={() => generateCover(chosenPrompt)}
            disabled={generating || !chosenPrompt.trim()}
            className="mt-2 rounded-xl bg-neutral-900 px-5 py-2.5 text-sm font-medium text-white hover:bg-neutral-700 disabled:opacity-50"
          >
            {generating ? "Generating..." : "Generate cover image"}
          </button>
          <p className="mt-1 text-xs text-neutral-400">
            Uses the image provider configured in Settings (OpenAI Images today —
            Claude doesn&rsquo;t generate images).
          </p>
        </div>

        {error && <p className="text-sm text-red-500">{error}</p>}
      </div>

      <div className="rounded-2xl border border-neutral-200 bg-white p-6 shadow-sm">
        <h2 className="mb-3 text-sm font-medium uppercase tracking-wide text-neutral-500">
          Export the full book
        </h2>
        {!readyToExport ? (
          <p className="text-sm text-neutral-400">
            Write or generate at least one chapter before exporting.
          </p>
        ) : (
          <>
            {missingTitle && (
              <p className="mb-3 text-sm text-amber-600">
                No book title set yet — the project name (&ldquo;{project.name}&rdquo;) will
                be used instead. Set a title above for a proper cover page.
              </p>
            )}
            {!book.coverImageDataUrl && (
              <p className="mb-3 text-sm text-neutral-400">
                No cover set — the EPUB will export without one. Use Cover Studio above
                to generate one first, if you&rsquo;d like.
              </p>
            )}
            <div className="flex flex-wrap items-center gap-3">
              <select
                className="rounded-xl border border-neutral-300 px-3 py-2 text-sm"
                value={exportFormat}
                onChange={(e) => setExportFormat(e.target.value as "epub" | "pdf" | "md")}
              >
                <option value="epub">EPUB</option>
                <option value="pdf">PDF</option>
                <option value="md">Markdown</option>
              </select>
              <label className="flex items-center gap-1.5 text-sm text-neutral-600">
                <input
                  type="checkbox"
                  checked={onlyFinal}
                  onChange={(e) => setOnlyFinal(e.target.checked)}
                />
                Only include chapters marked Final
              </label>
              <a
                href={`/api/projects/${id}/book/export?format=${exportFormat}&onlyFinal=${onlyFinal ? "1" : "0"}`}
                className="rounded-xl bg-neutral-900 px-5 py-2.5 text-sm font-medium text-white hover:bg-neutral-700"
              >
                Export book
              </a>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
