"use client";

import { useCallback, useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { toast } from "sonner";
import { ExternalLink, Minus, Plus } from "lucide-react";
import { api, ApiError, type ProviderInfo } from "@/lib/api";
import { AIProviderId, ClientProject } from "@/lib/types";
import {
  Badge,
  Button,
  ErrorState,
  Field,
  Input,
  Kicker,
  Lbl,
  PageHeader,
  Select,
  Skeleton,
  Ticks,
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
      <div className="px-4 py-10 sm:px-10">
        <ErrorState message={loadError} onRetry={load} />
      </div>
    );
  }

  if (!project || !providers) {
    return (
      <div className="space-y-4 px-4 py-10 sm:px-10">
        <Skeleton className="h-10 w-64" />
        <Skeleton className="h-4 w-96 max-w-full" />
        <Skeleton className="mt-6 h-96" />
      </div>
    );
  }

  const { aiSettings, imageSettings, rollingSummary } = project;
  const provider = providers.find((p) => p.id === aiSettings.provider) ?? providers[0];
  const keySaved = Boolean(aiSettings.configuredKeys[aiSettings.provider]);
  const imageKeySaved = imageSettings.hasApiKey;
  const visionModels = provider.models.filter((m) => m.vision).map((m) => m.label);

  return (
    <div className="px-4 py-10 sm:px-10">
      <PageHeader
        kicker="Per project · keys never leave your workspace"
        title="Settings"
        size={52}
        actions={
          // Only speaks up while something is actually happening — a
          // permanent "Idle" chip is noise, not status.
          <span aria-live="polite" className="min-h-[22px]">
            {status !== "idle" && (
              <Badge tone={status === "saving" ? "outline" : "accent"}>
                {status === "saving" ? "Saving…" : "Saved"}
              </Badge>
            )}
          </span>
        }
      />

      <div className="mt-8 grid gap-10 border-t-2 border-line pt-8 lg:grid-cols-2 lg:gap-0 lg:pt-10">
        {/* ---------------------------------------------------------- */}
        {/* Left: text generation                                       */}
        {/* ---------------------------------------------------------- */}
        <div className="min-w-0 lg:border-r-2 lg:border-line lg:pr-10">
          <Kicker className="mb-5">Text generation</Kicker>
          <div className="space-y-5">
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
                <div className="flex flex-wrap items-center gap-1.5 pt-1.5">
                  <Badge tone="accent">Vision</Badge>
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
                {keySaved && <Badge tone="accent">Key saved</Badge>}
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
          </div>

          <hr className="my-8 h-0.5 border-0 bg-line" />

          <Lbl>Full-text context window</Lbl>
          <div className="mt-4 flex items-center gap-4">
            <Button
              variant="secondary"
              size="icon"
              aria-label="Decrease context window"
              disabled={aiSettings.fullContextWindow <= 1}
              onClick={() =>
                updateAiSettings({
                  fullContextWindow: Math.max(1, aiSettings.fullContextWindow - 1),
                })
              }
            >
              <Minus className="h-4 w-4" aria-hidden />
            </Button>
            <span className="disp tnum w-10 text-center text-[32px]" aria-hidden>
              {aiSettings.fullContextWindow}
            </span>
            <Button
              variant="secondary"
              size="icon"
              aria-label="Increase context window"
              disabled={aiSettings.fullContextWindow >= 10}
              onClick={() =>
                updateAiSettings({
                  fullContextWindow: Math.min(10, aiSettings.fullContextWindow + 1),
                })
              }
            >
              <Plus className="h-4 w-4" aria-hidden />
            </Button>
            <label htmlFor="context-window" className="sr-only">
              Full-text context window
            </label>
            <input
              id="context-window"
              type="number"
              min={1}
              max={10}
              value={aiSettings.fullContextWindow}
              onChange={(e) =>
                updateAiSettings({ fullContextWindow: Number(e.target.value) || 1 })
              }
              className="sr-only"
            />
          </div>
          <Ticks
            className="mt-4 max-w-[220px]"
            value={aiSettings.fullContextWindow / 10}
            total={10}
          />
          <p className="mt-3 text-sm text-ink-muted">
            Recent chapters sent verbatim when generating. Older chapters fold into the
            hidden story-so-far summary instead.
          </p>

          <hr className="my-8 h-0.5 border-0 bg-line" />

          <Kicker className="mb-3">Hidden story-so-far summary</Kicker>
          <div className="space-y-4">
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
              shows up in your chapters — it&rsquo;s only used as background context
              for ideation.
            </p>
            {rollingSummary.entries.length > 0 && (
              <details className="border border-line bg-surface-2 p-3 text-xs text-ink-muted">
                <summary className="cursor-pointer font-medium text-ink">
                  View the log ({rollingSummary.entries.length} entries)
                </summary>
                <ul className="mt-2 space-y-2">
                  {rollingSummary.entries.map((e) => (
                    <li key={e.chapterIndex}>
                      <span className="font-medium text-ink">
                        Ch. {e.chapterIndex} — {e.chapterTitle}:
                      </span>{" "}
                      {e.summary}
                    </li>
                  ))}
                </ul>
              </details>
            )}
          </div>
        </div>

        {/* ---------------------------------------------------------- */}
        {/* Right: images, project                                      */}
        {/* ---------------------------------------------------------- */}
        <div className="min-w-0 lg:pl-10">
          <Kicker className="mb-5">Images</Kicker>
          <div className="grid gap-x-6 gap-y-4 sm:grid-cols-2">
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
              hint="Stored encrypted on the server. Falls back to OPENAI_API_KEY if left blank."
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
                {imageKeySaved && <Badge tone="accent">Key saved</Badge>}
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
          <p className="mt-3 text-xs text-ink-subtle">
            Cover generation always goes through OpenAI Images — Claude doesn&rsquo;t
            currently offer an image generation API.
          </p>

          <hr className="my-8 h-0.5 border-0 bg-line" />

          <Kicker className="mb-3">Project</Kicker>

          <div className="flex flex-wrap items-center justify-between gap-3 border-t-2 border-line py-4">
            <div className="min-w-0">
              <h3 className="text-[17px]">Export project file</h3>
              <p className="mt-1 text-sm text-ink-muted">
                Portable <span className="mono">.inkdrop.json</span> — bible, chapters
                and board. API keys are not included.
              </p>
            </div>
            <a href={`/api/projects/${id}/export`}>
              <Button variant="secondary" size="sm">
                Export
              </Button>
            </a>
          </div>
        </div>
      </div>
    </div>
  );
}
