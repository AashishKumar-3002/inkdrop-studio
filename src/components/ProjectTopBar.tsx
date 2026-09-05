"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { toast } from "sonner";
import { ChevronDown, Minus, Plus, Settings2 } from "lucide-react";
import { api, type ProviderInfo } from "@/lib/api";
import type { ClientProject } from "@/lib/types";
import { Button, Skeleton } from "@/components/ui";

type Settings = ClientProject["aiSettings"];

/**
 * The status strip: a persistent, quiet line stating exactly what the model
 * will be given. It sits directly under the tabs so the answer to "what does
 * it know right now?" is never more than a glance away.
 */
export default function ProjectTopBar({ projectId }: { projectId: string }) {
  const [settings, setSettings] = useState<Settings | null>(null);
  const [providers, setProviders] = useState<ProviderInfo[]>([]);
  const [open, setOpen] = useState(false);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    let cancelled = false;
    Promise.all([api.getProject(projectId), api.listProviders()])
      .then(([project, { providers }]) => {
        if (cancelled) return;
        setSettings(project.aiSettings);
        setProviders(providers);
      })
      .catch(() => {
        // The page surfaces load failures; the strip stays out of the way.
      });
    return () => {
      cancelled = true;
    };
  }, [projectId]);

  async function updateContext(delta: number) {
    if (!settings || saving) return;
    const next = Math.min(10, Math.max(0, settings.fullContextWindow + delta));
    if (next === settings.fullContextWindow) return;
    const previous = settings;
    setSettings({ ...settings, fullContextWindow: next });
    setSaving(true);
    try {
      await api.saveSettings(projectId, { fullContextWindow: next });
    } catch (e) {
      setSettings(previous);
      toast.error(e instanceof Error ? e.message : "Couldn't save that setting.");
    } finally {
      setSaving(false);
    }
  }

  if (!settings) {
    return (
      <div className="border-b-2 border-line bg-surface px-4 py-2.5 sm:px-10">
        <Skeleton className="h-3.5 w-72" />
      </div>
    );
  }

  const provider = providers.find((p) => p.id === settings.provider);
  const modelLabel =
    provider?.models.find((m) => m.id === settings.model)?.label || settings.model;
  const window = settings.fullContextWindow;

  return (
    <div className="border-b-2 border-line bg-surface text-ink-muted">
      <div className="flex flex-wrap items-center justify-between gap-x-4 gap-y-1 px-4 py-2 text-xs sm:px-10">
        <button
          onClick={() => setOpen((o) => !o)}
          aria-expanded={open}
          className="flex items-center gap-1.5 text-left transition-colors hover:text-ink"
        >
          <span>
            Model <b className="font-semibold text-ink">{provider?.label ?? settings.provider}</b>
            {" · "}
            <b className="font-semibold text-ink">{modelLabel}</b>
            <span className="hidden sm:inline">
              {" · "}Last{" "}
              <b className="font-semibold text-ink">
                {window} chapter{window === 1 ? "" : "s"}
              </b>{" "}
              verbatim
            </span>
          </span>
          <ChevronDown
            className={`h-3 w-3 shrink-0 transition-transform ${open ? "rotate-180" : ""}`}
          />
        </button>

        <Link
          href={`/project/${projectId}/settings`}
          className="flex items-center gap-1.5 transition-colors hover:text-ink"
        >
          <Settings2 className="h-3 w-3" />
          Full settings
        </Link>
      </div>

      {open && (
        <div className="animate-fade-in flex flex-wrap items-center gap-3 border-t border-hair px-4 py-2.5 text-xs sm:px-10">
          <span className="lbl">Chapters sent in full</span>
          <div className="flex items-center gap-1">
            <Button
              variant="secondary"
              size="icon"
              className="h-6 w-6"
              aria-label="Fewer chapters in full context"
              onClick={() => updateContext(-1)}
              disabled={window <= 0}
            >
              <Minus className="h-3 w-3" />
            </Button>
            <span className="tnum w-6 text-center font-semibold text-ink" aria-live="polite">
              {window}
            </span>
            <Button
              variant="secondary"
              size="icon"
              className="h-6 w-6"
              aria-label="More chapters in full context"
              onClick={() => updateContext(1)}
              disabled={window >= 10}
            >
              <Plus className="h-3 w-3" />
            </Button>
          </div>
          <span className="text-ink-subtle">
            Anything older is folded into the hidden story-so-far summary instead.
          </span>
        </div>
      )}
    </div>
  );
}
