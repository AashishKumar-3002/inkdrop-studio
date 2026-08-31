"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { toast } from "sonner";
import { ChevronDown, Minus, Plus, Settings2 } from "lucide-react";
import { api, type ProviderInfo } from "@/lib/api";
import type { ClientProject } from "@/lib/types";
import { Button, Skeleton } from "@/components/ui";

type Settings = ClientProject["aiSettings"];

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
        // The page itself surfaces load failures; the status bar just stays
        // out of the way rather than showing a second error.
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
      <div className="border-b border-line bg-surface-2/50 px-4 py-2 sm:px-6">
        <div className="mx-auto w-full max-w-6xl">
          <Skeleton className="h-4 w-64" />
        </div>
      </div>
    );
  }

  const provider = providers.find((p) => p.id === settings.provider);
  const modelLabel =
    provider?.models.find((m) => m.id === settings.model)?.label || settings.model;

  return (
    <div className="border-b border-line bg-surface-2/50">
      <div className="mx-auto flex w-full max-w-6xl flex-wrap items-center justify-between gap-2 px-4 py-1.5 text-xs sm:px-6">
        <button
          onClick={() => setOpen((o) => !o)}
          aria-expanded={open}
          className="flex items-center gap-3 rounded-lg px-2 py-1 text-ink-muted transition-colors hover:bg-surface-3"
        >
          <span>
            Model{" "}
            <span className="font-medium text-ink">
              {provider?.label ?? settings.provider} · {modelLabel}
            </span>
          </span>
          <span className="hidden sm:inline">
            Full context{" "}
            <span className="font-medium text-ink">
              {settings.fullContextWindow} chapter
              {settings.fullContextWindow === 1 ? "" : "s"}
            </span>
          </span>
          <ChevronDown
            className={`h-3.5 w-3.5 transition-transform ${open ? "rotate-180" : ""}`}
          />
        </button>

        <Link
          href={`/project/${projectId}/settings`}
          className="flex items-center gap-1.5 rounded-lg px-2 py-1 text-ink-subtle transition-colors hover:bg-surface-3 hover:text-ink"
        >
          <Settings2 className="h-3.5 w-3.5" />
          Full settings
        </Link>
      </div>

      {open && (
        <div className="animate-fade-in mx-auto flex w-full max-w-6xl flex-wrap items-center gap-3 px-4 pb-2.5 text-xs text-ink-muted sm:px-6">
          <span>Recent chapters sent in full when generating:</span>
          <div className="flex items-center gap-1">
            <Button
              variant="secondary"
              size="icon"
              className="h-6 w-6"
              aria-label="Fewer chapters in full context"
              onClick={() => updateContext(-1)}
              disabled={settings.fullContextWindow <= 0}
            >
              <Minus className="h-3 w-3" />
            </Button>
            <span
              className="w-6 text-center font-medium text-ink"
              aria-live="polite"
            >
              {settings.fullContextWindow}
            </span>
            <Button
              variant="secondary"
              size="icon"
              className="h-6 w-6"
              aria-label="More chapters in full context"
              onClick={() => updateContext(1)}
              disabled={settings.fullContextWindow >= 10}
            >
              <Plus className="h-3 w-3" />
            </Button>
          </div>
          <span className="text-ink-subtle">
            Older chapters are folded into the hidden story-so-far summary instead.
          </span>
        </div>
      )}
    </div>
  );
}
