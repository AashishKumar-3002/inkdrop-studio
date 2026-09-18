"use client";

import { useEffect, useRef, useState } from "react";
import { ChevronRight } from "lucide-react";
import { api } from "@/lib/api";

export default function ProjectName({ projectId }: { projectId: string }) {
  const [name, setName] = useState<string | null>(null);
  const [draft, setDraft] = useState("");
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const input = useRef<HTMLInputElement>(null);
  const submitting = useRef(false);
  const cancelledEdit = useRef(false);

  useEffect(() => {
    let cancelled = false;
    api.getProject(projectId).then(project => {
      if (!cancelled) setName(project.name);
    }).catch(() => {
      // The project page reports load failures.
    });
    return () => { cancelled = true; };
  }, [projectId]);

  useEffect(() => {
    if (editing) {
      input.current?.focus();
      input.current?.select();
    }
  }, [editing]);

  function startEditing() {
    if (name === null) return;
    cancelledEdit.current = false;
    setDraft(name);
    setError(null);
    setEditing(true);
  }

  async function save() {
    if (submitting.current || cancelledEdit.current) return;
    const trimmed = draft.trim();
    if (!trimmed) {
      setError("Enter a project name.");
      input.current?.focus();
      return;
    }
    if (trimmed === name) {
      setEditing(false);
      setError(null);
      return;
    }
    submitting.current = true;
    setSaving(true);
    setError(null);
    try {
      const updated = await api.updateProject(projectId, { name: trimmed });
      setName(updated.name);
      setEditing(false);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Couldn't rename this project.");
      input.current?.focus();
    } finally {
      submitting.current = false;
      setSaving(false);
    }
  }

  if (name === null) return null;
  return (
    <>
      <ChevronRight className="h-3.5 w-3.5 shrink-0 text-ink-subtle" aria-hidden />
      <div className="relative min-w-0 max-w-[50vw]">
        {editing ? (
          <input
            ref={input}
            aria-label="Project name"
            aria-describedby={error ? "project-name-error" : undefined}
            aria-invalid={!!error}
            className="w-full min-w-0 rounded-md border border-line bg-surface px-2 py-1 text-[13px] font-medium text-ink outline-none focus:border-accent"
            value={draft}
            maxLength={200}
            readOnly={saving}
            aria-busy={saving}
            onChange={event => { setDraft(event.target.value); setError(null); }}
            onBlur={() => { void save(); }}
            onKeyDown={event => {
              if (event.nativeEvent.isComposing) return;
              if (event.key === "Enter") { event.preventDefault(); void save(); }
              if (event.key === "Escape" && !saving) {
                event.preventDefault();
                cancelledEdit.current = true;
                setEditing(false);
                setError(null);
              }
            }}
          />
        ) : (
          <button
            type="button"
            className="block max-w-full truncate rounded-sm text-left text-[13px] font-medium focus-visible:outline-2 focus-visible:outline-accent"
            title={`${name} — double-click to rename`}
            aria-label={`Project name: ${name}. Double-click to rename, or press Enter.`}
            onDoubleClick={startEditing}
            onKeyDown={event => {
              if (event.key === "Enter" || event.key === " ") {
                event.preventDefault();
                startEditing();
              }
            }}
          >
            {name}
          </button>
        )}
        {error && <p id="project-name-error" role="alert" className="absolute left-0 top-full mt-1 w-64 rounded-md border border-danger-border bg-surface px-3 py-2 text-xs text-danger shadow-sm">{error}</p>}
      </div>
    </>
  );
}
