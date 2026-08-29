"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { api } from "@/lib/api";
import { AIProviderId, AISettings, ImageSettings, Project } from "@/lib/types";

const PROVIDER_INFO: Record<
  AIProviderId,
  { label: string; models: { id: string; label: string }[]; envVar: string }
> = {
  anthropic: {
    label: "Claude (Anthropic)",
    envVar: "ANTHROPIC_API_KEY",
    models: [
      { id: "claude-sonnet-4-5-20250929", label: "Claude Sonnet 4.5" },
      { id: "claude-opus-4-1-20250805", label: "Claude Opus 4.1" },
      { id: "claude-3-5-haiku-20241022", label: "Claude Haiku 3.5" },
    ],
  },
  openai: {
    label: "OpenAI",
    envVar: "OPENAI_API_KEY",
    models: [
      { id: "gpt-4.1", label: "GPT-4.1" },
      { id: "gpt-4.1-mini", label: "GPT-4.1 Mini" },
      { id: "o3", label: "o3" },
    ],
  },
};

const IMAGE_MODELS = [
  { id: "gpt-image-1", label: "GPT Image 1" },
  { id: "dall-e-3", label: "DALL·E 3" },
];

export default function SettingsPage() {
  const { id } = useParams<{ id: string }>();
  const [project, setProject] = useState<Project | null>(null);
  const [settings, setSettings] = useState<AISettings | null>(null);
  const [imageSettings, setImageSettings] = useState<ImageSettings | null>(null);
  const [status, setStatus] = useState<"idle" | "saving" | "saved">("idle");

  useEffect(() => {
    api.getProject(id).then((p) => {
      setProject(p);
      setSettings(p.aiSettings);
      setImageSettings(p.imageSettings);
    });
  }, [id]);

  async function update(patch: Partial<AISettings>) {
    if (!settings) return;
    const next = { ...settings, ...patch };
    setSettings(next);
    setStatus("saving");
    await api.saveSettings(id, patch);
    setStatus("saved");
    setTimeout(() => setStatus("idle"), 1200);
  }

  async function updateImage(patch: Partial<ImageSettings>) {
    if (!imageSettings) return;
    const next = { ...imageSettings, ...patch };
    setImageSettings(next);
    setStatus("saving");
    await api.saveImageSettings(id, patch);
    setStatus("saved");
    setTimeout(() => setStatus("idle"), 1200);
  }

  async function toggleRollingSummary(enabled: boolean) {
    if (!project) return;
    const updated = await api.saveRollingSummarySettings(id, { enabled });
    setProject(updated);
  }

  if (!settings || !project || !imageSettings) {
    return <div className="p-16 text-center text-neutral-400">Loading...</div>;
  }

  const info = PROVIDER_INFO[settings.provider];

  return (
    <div className="mx-auto w-full max-w-2xl px-6 py-10">
      <div className="mb-6 flex items-center justify-between">
        <h1 className="text-2xl font-semibold text-neutral-900">Settings</h1>
        <span className="text-xs text-neutral-400">
          {status === "saving" ? "Saving..." : status === "saved" ? "Saved" : ""}
        </span>
      </div>

      <div className="mb-6 space-y-6 rounded-2xl border border-neutral-200 bg-white p-6 shadow-sm">
        <h2 className="text-sm font-medium uppercase tracking-wide text-neutral-500">
          Writing model
        </h2>
        <div>
          <label className="mb-2 block text-sm font-medium text-neutral-700">Provider</label>
          <div className="flex gap-2">
            {(Object.keys(PROVIDER_INFO) as AIProviderId[]).map((pid) => (
              <button
                key={pid}
                onClick={() =>
                  update({ provider: pid, model: PROVIDER_INFO[pid].models[0].id })
                }
                className={`rounded-xl border px-4 py-2 text-sm ${
                  settings.provider === pid
                    ? "border-neutral-900 bg-neutral-900 text-white"
                    : "border-neutral-300 text-neutral-700 hover:border-neutral-500"
                }`}
              >
                {PROVIDER_INFO[pid].label}
              </button>
            ))}
          </div>
        </div>

        <div>
          <label className="mb-2 block text-sm font-medium text-neutral-700">Model</label>
          <select
            className="w-full rounded-xl border border-neutral-300 p-2.5 text-sm focus:border-neutral-900 focus:outline-none"
            value={settings.model}
            onChange={(e) => update({ model: e.target.value })}
          >
            {info.models.map((m) => (
              <option key={m.id} value={m.id}>
                {m.label}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label className="mb-2 block text-sm font-medium text-neutral-700">
            {info.label} API key
          </label>
          <input
            type="password"
            className="w-full rounded-xl border border-neutral-300 p-2.5 text-sm focus:border-neutral-900 focus:outline-none"
            placeholder={`Paste your key, or leave blank to use ${info.envVar} from the environment`}
            defaultValue={settings.apiKeys[settings.provider] ?? ""}
            onBlur={(e) =>
              update({
                apiKeys: { ...settings.apiKeys, [settings.provider]: e.target.value },
              })
            }
          />
          <p className="mt-1 text-xs text-neutral-400">
            Stored locally in this project&apos;s data file. If left blank, the app falls
            back to the <code>{info.envVar}</code> environment variable.
          </p>
        </div>

        <div>
          <label className="mb-2 block text-sm font-medium text-neutral-700">
            Full-text context window
          </label>
          <input
            type="number"
            min={1}
            max={10}
            className="w-24 rounded-xl border border-neutral-300 p-2.5 text-sm focus:border-neutral-900 focus:outline-none"
            value={settings.fullContextWindow}
            onChange={(e) => update({ fullContextWindow: Number(e.target.value) || 1 })}
          />
          <p className="mt-1 text-xs text-neutral-400">
            How many of the most recent chapters are sent in full when generating the
            next one. You can also adjust this from the bar at the top of every project
            page. Older chapters fall back to the hidden story-so-far summary below.
          </p>
        </div>
      </div>

      <div className="mb-6 space-y-4 rounded-2xl border border-neutral-200 bg-white p-6 shadow-sm">
        <h2 className="text-sm font-medium uppercase tracking-wide text-neutral-500">
          Hidden story-so-far summary
        </h2>
        <label className="flex items-center gap-2 text-sm text-neutral-700">
          <input
            type="checkbox"
            checked={project.rollingSummary.enabled}
            onChange={(e) => toggleRollingSummary(e.target.checked)}
          />
          Keep an automatic running summary of every chapter, and use it for continuity
          on chapters outside the full-text window
        </label>
        <p className="text-xs text-neutral-400">
          After each successful generation, Inkdrop asks the model for a short
          continuity note (characters, what changed) and appends it here. It never
          shows up in your chapters — it&rsquo;s only used as background context for
          ideation.
        </p>
        {project.rollingSummary.entries.length > 0 && (
          <details className="rounded-xl border border-neutral-200 bg-neutral-50 p-3 text-xs text-neutral-600">
            <summary className="cursor-pointer font-medium text-neutral-700">
              View the log ({project.rollingSummary.entries.length} entries)
            </summary>
            <ul className="mt-2 space-y-2">
              {project.rollingSummary.entries.map((e) => (
                <li key={e.chapterIndex}>
                  <span className="font-medium">
                    Ch. {e.chapterIndex} — {e.chapterTitle}:
                  </span>{" "}
                  {e.summary}
                </li>
              ))}
            </ul>
          </details>
        )}
      </div>

      <div className="mb-6 space-y-4 rounded-2xl border border-neutral-200 bg-white p-6 shadow-sm">
        <h2 className="text-sm font-medium uppercase tracking-wide text-neutral-500">
          Cover art / image generation
        </h2>
        <div>
          <label className="mb-2 block text-sm font-medium text-neutral-700">
            Image model
          </label>
          <select
            className="w-full rounded-xl border border-neutral-300 p-2.5 text-sm focus:border-neutral-900 focus:outline-none"
            value={imageSettings.model}
            onChange={(e) => updateImage({ model: e.target.value })}
          >
            {IMAGE_MODELS.map((m) => (
              <option key={m.id} value={m.id}>
                {m.label}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className="mb-2 block text-sm font-medium text-neutral-700">
            OpenAI API key
          </label>
          <input
            type="password"
            className="w-full rounded-xl border border-neutral-300 p-2.5 text-sm focus:border-neutral-900 focus:outline-none"
            placeholder="Paste your OpenAI key, or leave blank to use OPENAI_API_KEY"
            defaultValue={imageSettings.apiKey}
            onBlur={(e) => updateImage({ apiKey: e.target.value })}
          />
          <p className="mt-1 text-xs text-neutral-400">
            Cover generation always uses OpenAI Images — Claude doesn&rsquo;t currently
            offer an image generation API.
          </p>
        </div>
      </div>

      <div className="rounded-2xl border border-neutral-200 bg-white p-6 shadow-sm">
        <h2 className="mb-3 text-sm font-medium uppercase tracking-wide text-neutral-500">
          Project data
        </h2>
        <a
          href={`/api/projects/${id}/export`}
          className="inline-block rounded-xl border border-neutral-300 px-4 py-2 text-sm text-neutral-700 hover:border-neutral-500"
        >
          Export project (.inkdrop.json)
        </a>
        <p className="mt-2 text-xs text-neutral-400">
          Downloads everything — story bible, chapters, settings, and any API keys
          you&rsquo;ve entered here. Import it back on the home page, on this device or
          another one.
        </p>
      </div>
    </div>
  );
}
