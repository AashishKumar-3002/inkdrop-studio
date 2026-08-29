"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { api } from "@/lib/api";
import { AIProviderId, AISettings } from "@/lib/types";

const MODEL_LABELS: Record<string, string> = {
  "claude-sonnet-4-5-20250929": "Claude Sonnet 4.5",
  "claude-opus-4-1-20250805": "Claude Opus 4.1",
  "claude-3-5-haiku-20241022": "Claude Haiku 3.5",
  "gpt-4.1": "GPT-4.1",
  "gpt-4.1-mini": "GPT-4.1 Mini",
  o3: "o3",
};

const PROVIDER_LABELS: Record<AIProviderId, string> = {
  anthropic: "Claude",
  openai: "OpenAI",
};

export default function ProjectTopBar({ projectId }: { projectId: string }) {
  const [settings, setSettings] = useState<AISettings | null>(null);
  const [open, setOpen] = useState(false);

  useEffect(() => {
    api.getProject(projectId).then((p) => setSettings(p.aiSettings));
  }, [projectId]);

  async function updateContext(delta: number) {
    if (!settings) return;
    const next = Math.min(10, Math.max(1, settings.fullContextWindow + delta));
    setSettings({ ...settings, fullContextWindow: next });
    await api.saveSettings(projectId, { fullContextWindow: next });
  }

  if (!settings) return <div className="h-9" />;

  return (
    <div className="border-b border-neutral-200 bg-neutral-50/80 px-6 py-1.5">
      <div className="mx-auto flex max-w-5xl items-center justify-between text-xs text-neutral-500">
        <button
          onClick={() => setOpen((o) => !o)}
          className="flex items-center gap-3 rounded-lg px-2 py-1 hover:bg-neutral-100"
        >
          <span>
            Model:{" "}
            <span className="font-medium text-neutral-700">
              {PROVIDER_LABELS[settings.provider]} ·{" "}
              {MODEL_LABELS[settings.model] ?? settings.model}
            </span>
          </span>
          <span>
            Full context: <span className="font-medium text-neutral-700">
              {settings.fullContextWindow} chapter{settings.fullContextWindow === 1 ? "" : "s"}
            </span>
          </span>
          <span className="text-neutral-400">{open ? "▲" : "▼"}</span>
        </button>
        <Link
          href={`/project/${projectId}/settings`}
          className="rounded-lg px-2 py-1 text-neutral-400 hover:bg-neutral-100 hover:text-neutral-700"
        >
          Full settings →
        </Link>
      </div>

      {open && (
        <div className="mx-auto flex max-w-5xl items-center gap-4 pb-2 pt-1 text-xs text-neutral-500">
          <span>Recent chapters sent in full when generating:</span>
          <div className="flex items-center gap-1">
            <button
              onClick={() => updateContext(-1)}
              className="rounded-md border border-neutral-300 px-2 py-0.5 hover:bg-neutral-100"
            >
              −
            </button>
            <span className="w-5 text-center font-medium text-neutral-700">
              {settings.fullContextWindow}
            </span>
            <button
              onClick={() => updateContext(1)}
              className="rounded-md border border-neutral-300 px-2 py-0.5 hover:bg-neutral-100"
            >
              +
            </button>
          </div>
          <span className="text-neutral-400">
            Older chapters are folded into the hidden story-so-far summary instead.
          </span>
        </div>
      )}
    </div>
  );
}
