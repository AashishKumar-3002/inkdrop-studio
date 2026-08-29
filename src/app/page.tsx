"use client";

import { useEffect, useRef, useState } from "react";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { api } from "@/lib/api";
import { Project } from "@/lib/types";

export default function HomePage() {
  const router = useRouter();
  const [projects, setProjects] = useState<Project[]>([]);
  const [name, setName] = useState("");
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [importError, setImportError] = useState<string | null>(null);
  const [importing, setImporting] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    api
      .listProjects()
      .then(setProjects)
      .finally(() => setLoading(false));
  }, []);

  async function createProject() {
    if (creating) return;
    setCreating(true);
    try {
      const project = await api.createProject(name || "Untitled Project");
      router.push(`/project/${project.id}/onboarding`);
    } finally {
      setCreating(false);
    }
  }

  async function removeProject(id: string) {
    if (!confirm("Delete this project? This cannot be undone.")) return;
    await api.deleteProject(id);
    setProjects((prev) => prev.filter((p) => p.id !== id));
  }

  async function handleImportFile(file: File) {
    setImportError(null);
    setImporting(true);
    try {
      const text = await file.text();
      const data = JSON.parse(text);
      const project = await api.importProject(data);
      router.push(
        project.onboardingComplete
          ? `/project/${project.id}/chapters`
          : `/project/${project.id}/onboarding`
      );
    } catch (e) {
      setImportError(
        e instanceof Error ? e.message : "Couldn't read that file as an Inkdrop project."
      );
    } finally {
      setImporting(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  }

  return (
    <main className="mx-auto flex w-full max-w-3xl flex-1 flex-col px-6 py-16">
      <div className="mb-12 flex items-center gap-4">
        <Image src="/logo.png" alt="" width={56} height={56} className="rounded-2xl" />
        <div>
          <h1 className="text-3xl font-semibold tracking-tight text-neutral-900">
            Inkdrop Studio
          </h1>
          <p className="mt-1 text-neutral-500">
            Ideate your novel, build a story bible, and let AI draft full chapters
            from your ideas — grounded in your voice and your story so far.
          </p>
        </div>
      </div>

      <div className="mb-10 rounded-2xl border border-neutral-200 bg-white p-6 shadow-sm">
        <h2 className="mb-3 text-sm font-medium uppercase tracking-wide text-neutral-500">
          Start a new project
        </h2>
        <div className="flex gap-2">
          <input
            className="flex-1 rounded-xl border border-neutral-300 px-4 py-2.5 text-sm focus:border-neutral-900 focus:outline-none"
            placeholder="Project name (you can change the book's title later)"
            value={name}
            onChange={(e) => setName(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && createProject()}
          />
          <button
            onClick={createProject}
            disabled={creating}
            className="rounded-xl bg-neutral-900 px-5 py-2.5 text-sm font-medium text-white transition hover:bg-neutral-700 disabled:opacity-50"
          >
            {creating ? "Creating..." : "Create"}
          </button>
        </div>

        <div className="mt-4 flex items-center gap-3 border-t border-neutral-100 pt-4">
          <p className="flex-1 text-xs text-neutral-400">
            Already have a project exported from Inkdrop? Import its{" "}
            <code>.inkdrop.json</code> file.
          </p>
          <button
            onClick={() => fileInputRef.current?.click()}
            disabled={importing}
            className="rounded-xl border border-neutral-300 px-4 py-2 text-sm text-neutral-700 hover:border-neutral-500 disabled:opacity-50"
          >
            {importing ? "Importing..." : "Import project"}
          </button>
          <input
            ref={fileInputRef}
            type="file"
            accept="application/json,.json,.inkdrop.json"
            className="hidden"
            onChange={(e) => {
              const file = e.target.files?.[0];
              if (file) handleImportFile(file);
            }}
          />
        </div>
        {importError && <p className="mt-2 text-xs text-red-500">{importError}</p>}
      </div>

      <div>
        <h2 className="mb-3 text-sm font-medium uppercase tracking-wide text-neutral-500">
          Your projects
        </h2>
        {loading ? (
          <p className="text-sm text-neutral-400">Loading...</p>
        ) : projects.length === 0 ? (
          <p className="text-sm text-neutral-400">
            No projects yet — start one above.
          </p>
        ) : (
          <ul className="space-y-2">
            {projects.map((p) => (
              <li
                key={p.id}
                className="group flex items-center justify-between rounded-xl border border-neutral-200 bg-white px-5 py-4 shadow-sm transition hover:border-neutral-400"
              >
                <button
                  className="flex-1 text-left"
                  onClick={() =>
                    router.push(
                      p.onboardingComplete
                        ? `/project/${p.id}/chapters`
                        : `/project/${p.id}/onboarding`
                    )
                  }
                >
                  <div className="font-medium text-neutral-900">
                    {p.book?.title || p.name}
                  </div>
                  <div className="mt-0.5 text-xs text-neutral-400">
                    {p.name !== (p.book?.title || p.name) ? `${p.name} · ` : ""}
                    {p.chapters.length} chapter{p.chapters.length === 1 ? "" : "s"} ·{" "}
                    {p.onboardingComplete ? "Story bible ready" : "Onboarding incomplete"}
                  </div>
                </button>
                <button
                  onClick={() => removeProject(p.id)}
                  className="ml-4 text-xs text-neutral-300 opacity-0 transition hover:text-red-500 group-hover:opacity-100"
                >
                  Delete
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>
    </main>
  );
}
