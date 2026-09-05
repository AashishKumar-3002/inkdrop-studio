"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { BookText, Plus, Trash2, Upload } from "lucide-react";
import { api, type ProjectSummary } from "@/lib/api";
import {
  Badge,
  Button,
  Dialog,
  EmptyState,
  ErrorState,
  Field,
  Input,
  Kicker,
  Lbl,
  PageHeader,
  Rule,
  Skeleton,
  StatBand,
} from "@/components/ui";

function projectHref(p: { id: string; onboardingComplete: boolean }) {
  return p.onboardingComplete
    ? `/project/${p.id}/chapters`
    : `/project/${p.id}/onboarding`;
}

function formatRelative(iso: string): string {
  const days = Math.floor((Date.now() - new Date(iso).getTime()) / 86_400_000);
  if (days <= 0) return "today";
  if (days === 1) return "yesterday";
  if (days < 30) return `${days} days ago`;
  return new Date(iso).toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
  });
}

/** A stable slug shown as the project's filing code under its title. */
function code(name: string): string {
  return (
    name
      .toUpperCase()
      .replace(/[^A-Z0-9]+/g, "-")
      .replace(/^-|-$/g, "")
      .slice(0, 18) || "UNTITLED"
  );
}

export function DashboardClient() {
  const router = useRouter();
  const [projects, setProjects] = useState<ProjectSummary[]>([]);
  const [name, setName] = useState("");
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [creating, setCreating] = useState(false);
  const [importing, setImporting] = useState(false);
  const [pendingDelete, setPendingDelete] = useState<ProjectSummary | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Kicking off the request is synchronous and side-effect free; every
  // setState happens in a promise callback, which is what keeps this out of
  // React's "no synchronous setState in an effect" rule.
  const fetchProjects = useCallback(() => {
    api
      .listProjects()
      .then(setProjects)
      .catch((e: Error) => setLoadError(e.message))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    fetchProjects();
  }, [fetchProjects]);

  /** Retry from the error state — called from a click, so setState is fine. */
  const retry = useCallback(() => {
    setLoading(true);
    setLoadError(null);
    fetchProjects();
  }, [fetchProjects]);

  async function createProject() {
    if (creating) return;
    setCreating(true);
    try {
      const project = await api.createProject(name.trim() || "Untitled Project");
      router.push(`/project/${project.id}/onboarding`);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Couldn't create that project.");
      setCreating(false);
    }
  }

  async function confirmDelete() {
    const p = pendingDelete;
    if (!p) return;
    setPendingDelete(null);
    const previous = projects;
    setProjects((prev) => prev.filter((x) => x.id !== p.id));
    try {
      await api.deleteProject(p.id);
      toast.success("Project deleted.");
    } catch (e) {
      setProjects(previous);
      toast.error(e instanceof Error ? e.message : "Couldn't delete that project.");
    }
  }

  async function handleImportFile(file: File) {
    setImporting(true);
    try {
      const data = JSON.parse(await file.text());
      const project = await api.importProject(data);
      toast.success("Project imported.");
      router.push(projectHref(project));
    } catch (e) {
      toast.error(
        e instanceof Error ? e.message : "Couldn't read that file as an Inkdrop project."
      );
      setImporting(false);
    } finally {
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  }

  const totals = projects.reduce(
    (acc, p) => ({
      words: acc.words + p.wordCount,
      chapters: acc.chapters + p.chapterCount,
    }),
    { words: 0, chapters: 0 }
  );

  return (
    <>
      <PageHeader
        kicker="Workspace"
        title="Your projects"
        description="Pick up where you left off, or start something new."
        size={58}
        actions={
          <>
            <Button
              variant="secondary"
              onClick={() => fileInputRef.current?.click()}
              loading={importing}
            >
              <Upload className="h-4 w-4" />
              Import .inkdrop.json
            </Button>
            <Button onClick={createProject} loading={creating}>
              <Plus className="h-4 w-4" />
              New project
            </Button>
          </>
        }
      />
      <input
        ref={fileInputRef}
        type="file"
        accept="application/json,.json"
        className="hidden"
        onChange={(e) => {
          const file = e.target.files?.[0];
          if (file) handleImportFile(file);
        }}
      />

      {projects.length > 0 && (
        <StatBand
          className="mt-10"
          stats={[
            { value: totals.words.toLocaleString(), label: "Words written" },
            { value: totals.chapters, label: "Chapters" },
            { value: projects.length, label: "Projects" },
            {
              value: projects.filter((p) => p.onboardingComplete).length,
              label: "Bibles complete",
            },
          ]}
        />
      )}

      <section className="mt-10">
        {loading ? (
          <div className="space-y-px" aria-busy>
            <Skeleton className="h-20" />
            <Skeleton className="h-20" />
            <Skeleton className="h-20" />
          </div>
        ) : loadError ? (
          <ErrorState message={loadError} onRetry={retry} />
        ) : projects.length === 0 ? (
          <EmptyState
            kicker="No projects yet"
            title="Name it, and Inkdrop will ask the right questions."
            description="Start a project and you'll be walked through a short questionnaire that becomes the story bible every chapter is written against."
            action={
              <>
                <Button onClick={createProject} loading={creating}>
                  <Plus className="h-4 w-4" />
                  New project
                </Button>
                <Button
                  variant="secondary"
                  onClick={() => fileInputRef.current?.click()}
                  loading={importing}
                >
                  <Upload className="h-4 w-4" />
                  Import a project
                </Button>
              </>
            }
          />
        ) : (
          <>
            <div className="flex items-center justify-between pb-3">
              <Lbl>All projects</Lbl>
              <Lbl className="hidden sm:block">Chapters · Words · Bible · Edited</Lbl>
            </div>

            {projects.map((p, i) => {
              const title = p.book?.title || p.name;
              return (
                <div
                  key={p.id}
                  className="grid grid-cols-[minmax(0,1fr)_auto] items-baseline gap-x-6 gap-y-3 border-t-2 border-line py-4 pl-6 sm:grid-cols-[46px_minmax(0,1fr)_70px_90px_110px_90px_60px]"
                >
                  <p className="rnum hidden sm:block">{String(i + 1).padStart(2, "0")}</p>

                  <div className="min-w-0">
                    <Link href={projectHref(p)} className="group">
                      <h2 className="truncate text-[22px] leading-tight group-hover:text-accent">
                        {title}
                      </h2>
                    </Link>
                    <p className="mono mt-1.5 text-ink-muted">
                      {code(p.name)}
                      <span className="sm:hidden">
                        {" · "}
                        {p.chapterCount} CH · {p.wordCount.toLocaleString()} W ·{" "}
                        {formatRelative(p.updatedAt).toUpperCase()}
                      </span>
                    </p>
                  </div>

                  <span className="tnum hidden text-sm sm:block">{p.chapterCount}</span>
                  <span className="tnum hidden text-sm sm:block">
                    {p.wordCount > 0 ? p.wordCount.toLocaleString() : "—"}
                  </span>
                  <span className="hidden sm:block">
                    {p.onboardingComplete ? (
                      <Badge tone="accent">Bible ready</Badge>
                    ) : (
                      <Badge tone="outline">Incomplete</Badge>
                    )}
                  </span>
                  <span className="tnum hidden text-sm text-ink-muted sm:block">
                    {formatRelative(p.updatedAt)}
                  </span>

                  <span className="flex items-center gap-3 text-ink-muted">
                    <Link
                      href={projectHref(p)}
                      aria-label={`Open ${title}`}
                      title="Open project"
                      className="transition-colors hover:text-accent"
                    >
                      <BookText className="h-4 w-4" />
                    </Link>
                    <button
                      aria-label={`Delete ${title}`}
                      title="Delete project"
                      onClick={() => setPendingDelete(p)}
                      className="transition-colors hover:text-danger"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </span>
                </div>
              );
            })}

            <Rule />

            <div className="grid gap-8 pt-6 lg:grid-cols-2 lg:items-end lg:gap-0">
              <div className="lg:pr-10">
                <Field label="Start a new project" htmlFor="new-project">
                  <div className="flex gap-2">
                    <Input
                      id="new-project"
                      className="flex-1"
                      placeholder="Project name — the book's title comes later"
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === "Enter") createProject();
                      }}
                    />
                    <Button onClick={createProject} loading={creating}>
                      Create
                    </Button>
                  </div>
                </Field>
              </div>
              <div className="flex items-center gap-4 lg:border-l lg:border-hair lg:pl-10">
                <p className="flex-1 text-[13px] text-ink-muted">
                  Exported from Inkdrop before? Import the file and it lands with its
                  bible, chapters and board intact.
                </p>
                <Button
                  variant="secondary"
                  onClick={() => fileInputRef.current?.click()}
                  loading={importing}
                >
                  Import
                </Button>
              </div>
            </div>
          </>
        )}
      </section>

      <Dialog
        open={pendingDelete !== null}
        onClose={() => setPendingDelete(null)}
        kicker="This can't be undone"
        title={`Delete “${pendingDelete?.book?.title || pendingDelete?.name}”?`}
        actions={
          <>
            <Button variant="danger" onClick={confirmDelete}>
              <Trash2 className="h-4 w-4" />
              Delete project
            </Button>
            {pendingDelete && (
              <a href={`/api/projects/${pendingDelete.id}/export`}>
                <Button variant="secondary">Export first</Button>
              </a>
            )}
            <Button variant="ghost" onClick={() => setPendingDelete(null)}>
              Cancel
            </Button>
          </>
        }
      >
        {pendingDelete && (
          <>
            Its {pendingDelete.chapterCount} chapter
            {pendingDelete.chapterCount === 1 ? "" : "s"},{" "}
            {pendingDelete.wordCount.toLocaleString()} words and the whole story bible
            go with it. Export the project file first if you want a copy you can bring
            back.
          </>
        )}
      </Dialog>

      <Kicker className="sr-only">End of project list</Kicker>
    </>
  );
}
