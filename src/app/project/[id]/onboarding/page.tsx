"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { toast } from "sonner";
import { ONBOARDING_STEPS, SECTION_META } from "@/lib/questionnaire";
import { AnswerValue, emptyStoryBible, StoryBible } from "@/lib/types";
import QuestionCard, { emptyAnswer } from "@/components/QuestionCard";
import { api } from "@/lib/api";
import { Button, ErrorState, LoadingState } from "@/components/ui";

export default function OnboardingPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const [bible, setBible] = useState<StoryBible>(emptyStoryBible());
  const [projectName, setProjectName] = useState("");
  const [step, setStep] = useState(0);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const load = useCallback(() => {
    api
      .getProject(id)
      .then((p) => {
        setBible(p.storyBible);
        setProjectName(p.name);
      })
      .catch((e) => {
        setLoadError(e instanceof Error ? e.message : "Couldn't load this project.");
      })
      .finally(() => setLoading(false));
  }, [id]);

    // The effect only kicks off the request; every setState lands in a
  // promise callback, satisfying React's no-sync-setState-in-effect rule.
  useEffect(() => {
    load();
  }, [load]);

  /** Retry from the error state — a click handler, so setState is fine. */
  const retry = useCallback(() => {
    setLoading(true);
    setLoadError(null);
    load();
  }, [load]);

  const current = ONBOARDING_STEPS[step];
  const totalSteps = ONBOARDING_STEPS.length;
  const progress = useMemo(
    () => Math.round(((step + 1) / totalSteps) * 100),
    [step, totalSteps]
  );

  function updateAnswer(qid: string, sectionId: keyof StoryBible, value: AnswerValue) {
    setBible((prev) => ({
      ...prev,
      [sectionId]: {
        ...prev[sectionId],
        answers: { ...prev[sectionId].answers, [qid]: value },
      },
    }));
  }

  async function persist(onboardingComplete: boolean) {
    setSaving(true);
    try {
      await api.saveBible(id, bible, onboardingComplete);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Couldn't save your answers.");
      throw e;
    } finally {
      setSaving(false);
    }
  }

  async function goNext() {
    try {
      await persist(false);
    } catch {
      return;
    }
    if (step < totalSteps - 1) {
      setStep((s) => s + 1);
    } else {
      try {
        await persist(true);
      } catch {
        return;
      }
      router.push(`/project/${id}/chapters`);
    }
  }

  function goBack() {
    if (step > 0) setStep((s) => s - 1);
  }

  async function skipToEnd() {
    try {
      await persist(true);
    } catch {
      return;
    }
    router.push(`/project/${id}/chapters`);
  }

  if (loading) {
    return (
      <div className="mx-auto w-full max-w-2xl px-6 py-12">
        <LoadingState label="Loading your project…" />
      </div>
    );
  }

  if (loadError) {
    return (
      <div className="mx-auto w-full max-w-2xl px-6 py-12">
        <ErrorState message={loadError} onRetry={retry} />
      </div>
    );
  }

  const meta = SECTION_META[current.section];

  return (
    <div className="mx-auto flex w-full max-w-2xl flex-1 flex-col px-4 py-10 sm:px-6 sm:py-12">
      <div className="mb-8">
        <div className="mb-2 flex flex-col gap-2 text-xs text-ink-subtle sm:flex-row sm:items-center sm:justify-between">
          <span aria-live="polite">
            Setting up &ldquo;{projectName}&rdquo; — Step {step + 1} of {totalSteps}
          </span>
          <button
            onClick={skipToEnd}
            className="text-left text-ink-subtle underline hover:text-ink-muted sm:text-right"
          >
            Skip the rest, I&rsquo;ll fill in the story bible later
          </button>
        </div>
        <div
          className="h-1.5 w-full overflow-hidden rounded-full bg-surface-3"
          role="progressbar"
          aria-valuenow={progress}
          aria-valuemin={0}
          aria-valuemax={100}
        >
          <div
            className="h-full rounded-full bg-accent transition-all"
            style={{ width: `${progress}%` }}
          />
        </div>
      </div>

      <div className="mb-8">
        <h1 className="text-2xl font-semibold text-ink">{meta.label}</h1>
        <p className="mt-1 text-ink-muted">{meta.blurb}</p>
      </div>

      <div className="flex-1 space-y-10">
        {current.questions.map((q) => (
          <QuestionCard
            key={q.id}
            question={q}
            value={bible[current.section].answers[q.id] ?? emptyAnswer()}
            onChange={(value) => updateAnswer(q.id, current.section, value)}
          />
        ))}
      </div>

      <div className="mt-10 flex items-center justify-between gap-3 border-t border-line pt-6">
        <Button variant="ghost" onClick={goBack} disabled={step === 0}>
          Back
        </Button>
        <Button onClick={goNext} loading={saving}>
          {step < totalSteps - 1 ? "Next" : "Finish & build story bible"}
        </Button>
      </div>
    </div>
  );
}
