"use client";

import { useCallback, useEffect, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { toast } from "sonner";
import { ExternalLink, ArrowLeft } from "lucide-react";
import { api, ApiError, type ProviderInfo } from "@/lib/api";
import { AIProviderId, ClientProject } from "@/lib/types";
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
} from "@/components/ui";

type SaveStatus = "idle" | "saving" | "saved";

const IMAGE_MODELS = [
  { id: "gpt-image-1", label: "GPT Image 1" },
  { id: "dall-e-3", label: "DALL·E 3" },
];

export default function SettingsPage() {
  const { id } = useParams<{ id: string }>();
  const [project, setProject] = useState<ClientProject | null>(null);
  const [providers, setProviders] = useState<ProviderInfo[] | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [status, setStatus] = useState<SaveStatus>("idle");

  // Local, uncommitted text for API-key inputs — never prefilled with the
  // server's masked value, and only sent if the user actually typed something.
  const [aiKeyDraft, setAiKeyDraft] = useState("");
  const [imageKeyDraft, setImageKeyDraft] = useState("");

  const load = useCallback(() => {
    setLoadError(null);
    setProject(null);
    Promise.all([api.getProject(id), api.listProviders()])
      .then(([p, { providers }]) => {
        setProject(p);
        setProviders(providers);
      })
      .catch((e: unknown) =>
        setLoadError(e instanceof Error ? e.message : "Couldn't load settings.")
      );
  }, [id]);

  useEffect(() => {
    // Initial data fetch on mount / id change — load() manages its own
    // loading/error state, there is no way to defer that off the effect.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    load();
  }, [load]);

  function flashSaved() {
    setStatus("saved");
    setTimeout(() => setStatus("idle"), 1200);
  }

  async function updateAiSettings(
    patch: Partial<{
      provider: AIProviderId;
      model: string;
      fullContextWindow: number;
    }> & { apiKey?: string; apiKeyProvider?: AIProviderId }
  ) {
    if (!project) return;
    setStatus("saving");
    try {
      const updated = await api.saveSettings(id, patch);
      setProject(updated);
      flashSaved();
      toast.success("AI settings saved.");
    } catch (e) {
      setStatus("idle");
      toast.error(e instanceof ApiError ? e.message : "Couldn't save AI settings.");
    }
  }

  async function updateImageSettings(
    patch: Partial<{ provider: "openai"; model: string }> & { apiKey?: string }
  ) {
    if (!project) return;
    setStatus("saving");
    try {
      const updated = await api.saveImageSettings(id, patch);
      setProject(updated);
      flashSaved();
      toast.success("Image settings saved.");
    } catch (e) {
      setStatus("idle");
      toast.error(e instanceof ApiError ? e.message : "Couldn't save image settings.");
    }
  }

  async function toggleRollingSummary(enabled: boolean) {
    if (!project) return;
    try {
      const updated = await api.saveRollingSummarySettings(id, { enabled });
      setProject(updated);
      toast.success(enabled ? "Rolling summary enabled." : "Rolling summary disabled.");
    } catch (e) {
      toast.error(
        e instanceof ApiError ? e.message : "Couldn't update the rolling summary."
      );
    }
  }

  if (loadError) {
    return (
      <div className="mx-auto w-full max-w-2xl px-6 py-10">
        <ErrorState message={loadError} onRetry={load} />
      </div>
    );
  }

  if (!project || !providers) {
    return (
      <div className="mx-auto w-full max-w-2xl space-y-6 px-6 py-10">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-64" />
        <Skeleton className="h-40" />
        <Skeleton className="h-56" />
      </div>
    );
  }

  const { aiSettings, imageSettings, rollingSummary } = project;
  const provider = providers.find((p) => p.id === aiSettings.provider) ?? providers[0];
  const keySaved = Boolean(aiSettings.configuredKeys[aiSettings.provider]);
  const imageKeySaved = imageSettings.hasApiKey;
  const visionModels = provider.models.filter((m) => m.vision).map((m) => m.label);

  return (
    <div className="mx-auto w-full max-w-2xl px-6 py-10">
      <div className="mb-6 flex items-center justify-between gap-3">
        <div>
          <Link
            href="/dashboard"
            className="mb-2 inline-flex items-center gap-1 text-xs text-ink-muted hover:text-ink"
          >
            <ArrowLeft className="h-3.5 w-3.5" />
            Dashboard
          </Link>
          <h1 className="text-2xl font-semibold tracking-tight text-ink">Settings</h1>
        </div>
        <span className="text-xs text-ink-subtle" role="status" aria-live="polite">
          {status === "saving" ? "Saving…" : status === "saved" ? "Saved" : ""}
        </span>
      </div>

      <div className="space-y-6">
        <Card>
          <CardHeader
            title="Writing model"
            description="Which AI provider and model generate your chapters."
          />
          <div className="space-y-5 p-5">
            <Field label="Provider" htmlFor="ai-provider">
              <Select
                id="ai-provider"
                value={aiSettings.provider}
                onChange={(e) => {
                  const nextId = e.target.value as AIProviderId;
                  const next = providers.find((p) => p.id === nextId);
                  updateAiSettings({
                    provider: nextId,
                    model: next?.defaultModel ?? aiSettings.model,
                  });
                }}
              >
                {providers.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.label}
                  </option>
                ))}
              </Select>
            </Field>

            <Field label="Model" htmlFor="ai-model">
              <Select
                id="ai-model"
                value={aiSettings.model}
                onChange={(e) => updateAiSettings({ model: e.target.value })}
              >
                {provider.models.map((m) => (
                  <option key={m.id} value={m.id}>
                    {m.label}
                    {m.vision ? " (vision)" : ""}
                  </option>
                ))}
              </Select>
              {provider.models.some((m) => m.vision) && (
                <div className="flex flex-wrap items-center gap-1.5 pt-1">
                  <Badge tone="accent">vision</Badge>
                  <span className="text-xs text-ink-subtle">
                    The storyboard sketch feature needs a vision-capable model
                    {visionModels.length > 0 && ` (e.g. ${visionModels.join(", ")})`}.
                  </span>
                </div>
              )}
            </Field>

            <Field
              label={`${provider.label} API key`}
              htmlFor="ai-key"
              hint={
                <span className="flex flex-col gap-1">
                  <span>
                    {provider.keyHint ??
                      `Stored encrypted on the server. Leave blank to fall back to ${provider.envVar} on the server.`}
                  </span>
                  {provider.docsUrl && (
                    <a
                      href={provider.docsUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex w-fit items-center gap-1 text-accent hover:underline"
                    >
                      Get a key <ExternalLink className="h-3 w-3" />
                    </a>
                  )}
                </span>
              }
            >
              <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
                <Input
                  id="ai-key"
                  type="password"
                  className="flex-1"
                  autoComplete="off"
                  placeholder={keySaved ? "••••••••" : `Paste your ${provider.label} key`}
                  value={aiKeyDraft}
                  onChange={(e) => setAiKeyDraft(e.target.value)}
                />
                {keySaved && <Badge tone="success">Key saved</Badge>}
              </div>
              <div className="mt-2 flex gap-2">
                <Button
                  size="sm"
                  variant="secondary"
                  disabled={!aiKeyDraft.trim()}
                  onClick={async () => {
                    await updateAiSettings({
                      apiKey: aiKeyDraft.trim(),
                      apiKeyProvider: aiSettings.provider,
                    });
                    setAiKeyDraft("");
                  }}
                >
                  {keySaved ? "Replace key" : "Save key"}
                </Button>
                {keySaved && (
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() =>
                      updateAiSettings({
                        apiKey: "",
                        apiKeyProvider: aiSettings.provider,
                      })
                    }
                  >
                    Remove
                  </Button>
                )}
              </div>
            </Field>

            <Field
              label="Full-text context window"
              htmlFor="context-window"
              hint="How many of the most recent chapters are sent in full when generating the next one. You can also adjust this from the bar at the top of every project page. Older chapters fall back to the hidden story-so-far summary below."
            >
              <Input
                id="context-window"
                type="number"
                min={1}
                max={10}
                className="w-24"
                value={aiSettings.fullContextWindow}
                onChange={(e) =>
                  updateAiSettings({ fullContextWindow: Number(e.target.value) || 1 })
                }
              />
            </Field>
          </div>
        </Card>

        <Card>
          <CardHeader
            title="Hidden story-so-far summary"
            description="Continuity notes kept outside the full-text window."
          />
          <div className="space-y-4 p-5">
            <label className="flex items-start gap-2 text-sm text-ink">
              <input
                type="checkbox"
                className="mt-0.5"
                checked={rollingSummary.enabled}
                onChange={(e) => toggleRollingSummary(e.target.checked)}
              />
              Keep an automatic running summary of every chapter, and use it for
              continuity on chapters outside the full-text window
            </label>
            <p className="text-xs text-ink-subtle">
              After each successful generation, Inkdrop asks the model for a short
              continuity note (characters, what changed) and appends it here. It never
              shows up in your chapters &mdash; it&rsquo;s only used as background
              context for ideation.
            </p>
            {rollingSummary.entries.length > 0 && (
              <details className="rounded-lg border border-line bg-surface-2 p-3 text-xs text-ink-muted">
                <summary className="cursor-pointer font-medium text-ink">
                  View the log ({rollingSummary.entries.length} entries)
                </summary>
                <ul className="mt-2 space-y-2">
                  {rollingSummary.entries.map((e) => (
                    <li key={e.chapterIndex}>
                      <span className="font-medium text-ink">
                        Ch. {e.chapterIndex} &mdash; {e.chapterTitle}:
                      </span>{" "}
                      {e.summary}
                    </li>
                  ))}
                </ul>
              </details>
            )}
          </div>
        </Card>

        <Card>
          <CardHeader
            title="Cover art / image generation"
            description="Cover generation always goes through OpenAI Images."
          />
          <div className="space-y-5 p-5">
            <Field label="Image model" htmlFor="image-model">
              <Select
                id="image-model"
                value={imageSettings.model}
                onChange={(e) => updateImageSettings({ model: e.target.value })}
              >
                {IMAGE_MODELS.map((m) => (
                  <option key={m.id} value={m.id}>
                    {m.label}
                  </option>
                ))}
              </Select>
            </Field>

            <Field
              label="OpenAI API key"
              htmlFor="image-key"
              hint="Stored encrypted on the server. Leave blank to fall back to OPENAI_API_KEY on the server. Cover generation always uses OpenAI Images &mdash; Claude doesn&rsquo;t currently offer an image generation API."
            >
              <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
                <Input
                  id="image-key"
                  type="password"
                  className="flex-1"
                  autoComplete="off"
                  placeholder={imageKeySaved ? "••••••••" : "Paste your OpenAI key"}
                  value={imageKeyDraft}
                  onChange={(e) => setImageKeyDraft(e.target.value)}
                />
                {imageKeySaved && <Badge tone="success">Key saved</Badge>}
              </div>
              <div className="mt-2 flex gap-2">
                <Button
                  size="sm"
                  variant="secondary"
                  disabled={!imageKeyDraft.trim()}
                  onClick={async () => {
                    await updateImageSettings({ apiKey: imageKeyDraft.trim() });
                    setImageKeyDraft("");
                  }}
                >
                  {imageKeySaved ? "Replace key" : "Save key"}
                </Button>
                {imageKeySaved && (
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => updateImageSettings({ apiKey: "" })}
                  >
                    Remove
                  </Button>
                )}
              </div>
            </Field>
          </div>
        </Card>

        <Card>
          <CardHeader title="Project data" description="Back up or move this project." />
          <div className="space-y-2 p-5">
            <a
              href={`/api/projects/${id}/export`}
              className="inline-flex h-8 items-center gap-1.5 rounded-lg border border-line-strong bg-surface px-3 text-xs font-medium text-ink transition-colors hover:bg-surface-2"
            >
              Export project (.inkdrop.json)
            </a>
            <p className="text-xs text-ink-subtle">
              Downloads your story bible, chapters, and settings. API keys are{" "}
              <strong>not</strong> included &mdash; re-enter them after importing on
              another device. Import it back on the dashboard.
            </p>
          </div>
        </Card>
      </div>
    </div>
  );
}
