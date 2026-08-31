"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { BookText, Plus, Trash2, Upload } from "lucide-react";
import { api, type ProjectSummary } from "@/lib/api";
import {
  Button,
  Card,
  EmptyState,
  ErrorState,
  Input,
  Skeleton,
} from "@/components/ui";

function projectHref(p: { id: string; onboardingComplete: boolean }) {
  return p.onboardingComplete
    ? `/project/${p.id}/chapters`
    : `/project/${p.id}/onboarding`;
}

function formatRelative(iso: string): string {
  const then = new Date(iso).getTime();
  const days = Math.floor((Date.now() - then) / 86_400_000);
  if (days <= 0) return "today";
  if (days === 1) return "yesterday";
  if (days < 30) return `${days} days ago`;
  return new Date(iso).toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

export function DashboardClient() {
  const router = useRouter();
  const [projects, setProjects] = useState<ProjectSummary[]>([]);
  const [name, setName] = useState("");
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [creating, setCreating] = useState(false);
  const [importing, setImporting] = useState(false);
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

  async function removeProject(p: ProjectSummary) {
    if (
      !confirm(
        `Delete "${p.book?.title || p.name}"? Its chapters and story bible go with it. This can't be undone.`
      )
    ) {
      return;
    }
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
        e instanceof Error
          ? e.message
          : "Couldn't read that file as an Inkdrop project."
      );
      setImporting(false);
    } finally {
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  }

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight text-ink">Your projects</h1>
        <p className="mt-1 text-sm text-ink-muted">
          Pick up where you left off, or start something new.
        </p>
      </div>

      <Card className="p-5">
        <h2 className="mb-3 text-sm font-semibold text-ink">Start a new project</h2>
        <div className="flex flex-col gap-2 sm:flex-row">
          <Input
            className="flex-1"
            placeholder="Project name — the book's title comes later"
            value={name}
            aria-label="New project name"
            onChange={(e) => setName(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") createProject();
            }}
          />
          <Button onClick={createProject} loading={creating}>
            <Plus className="h-4 w-4" />
            Create
          </Button>
        </div>

        <div className="mt-4 flex flex-col gap-3 border-t border-line pt-4 sm:flex-row sm:items-center">
          <p className="flex-1 text-xs text-ink-subtle">
            Have a project exported from Inkdrop? Import its{" "}
            <code className="rounded bg-surface-2 px-1 py-0.5">.inkdrop.json</code> file.
          </p>
          <Button
            variant="secondary"
            size="sm"
            onClick={() => fileInputRef.current?.click()}
            loading={importing}
          >
            <Upload className="h-4 w-4" />
            Import project
          </Button>
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
        </div>
      </Card>

      <section>
        {loading ? (
          <div className="space-y-2" aria-busy>
            <Skeleton className="h-[74px]" />
            <Skeleton className="h-[74px]" />
            <Skeleton className="h-[74px]" />
          </div>
        ) : loadError ? (
          <ErrorState message={loadError} onRetry={retry} />
        ) : projects.length === 0 ? (
          <EmptyState
            icon={<BookText className="h-8 w-8" />}
            title="No projects yet"
            description="Name a project above and Inkdrop will walk you through building its story bible."
          />
        ) : (
          <ul className="space-y-2">
            {projects.map((p) => {
              const displayTitle = p.book?.title || p.name;
              return (
                <li key={p.id}>
                  <Card className="group flex items-center gap-3 px-5 py-4 transition-colors hover:border-line-strong">
                    <Link href={projectHref(p)} className="min-w-0 flex-1">
                      <div className="truncate font-medium text-ink">{displayTitle}</div>
                      <div className="mt-0.5 truncate text-xs text-ink-muted">
                        {p.name !== displayTitle && `${p.name} · `}
                        {p.chapterCount} chapter{p.chapterCount === 1 ? "" : "s"}
                        {p.wordCount > 0 &&
                          ` · ${p.wordCount.toLocaleString()} words`}
                        {" · "}
                        {p.onboardingComplete ? "Story bible ready" : "Bible incomplete"}
                        {" · edited "}
                        {formatRelative(p.updatedAt)}
                      </div>
                    </Link>
                    <Button
                      variant="ghost"
                      size="icon"
                      aria-label={`Delete ${displayTitle}`}
                      title="Delete project"
                      onClick={() => removeProject(p)}
                      className="opacity-0 transition-opacity hover:text-danger focus-visible:opacity-100 group-hover:opacity-100"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </Card>
                </li>
              );
            })}
          </ul>
        )}
      </section>
    </div>
  );
}
