"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { toast } from "sonner";
import { ONBOARDING_STEPS, SECTION_META } from "@/lib/questionnaire";
import { AnswerValue, emptyStoryBible, StoryBible } from "@/lib/types";
import QuestionCard, { emptyAnswer } from "@/components/QuestionCard";
import { api } from "@/lib/api";
import { Button, Display, ErrorState, LoadingState, Ticks } from "@/components/ui";

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
  const progress = useMemo(() => (step + 1) / totalSteps, [step, totalSteps]);

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
      <div className="mx-auto w-full max-w-3xl px-4 py-12 sm:px-10">
        <LoadingState label="Loading your project…" />
      </div>
    );
  }

  if (loadError) {
    return (
      <div className="mx-auto w-full max-w-3xl px-4 py-12 sm:px-10">
        <ErrorState message={loadError} onRetry={retry} />
      </div>
    );
  }

  const meta = SECTION_META[current.section];

  return (
    <div className="mx-auto flex w-full max-w-3xl flex-1 flex-col px-4 py-10 sm:px-10 sm:py-12">
      <div className="mb-10 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <span className="kicker mb-2" aria-live="polite">
            Setting up &ldquo;{projectName}&rdquo; — Section {step + 1} of {totalSteps}
          </span>
          <Display size={48}>{meta.label}</Display>
        </div>
        <button
          onClick={skipToEnd}
          className="text-left text-xs text-ink-subtle underline underline-offset-2 hover:text-ink-muted sm:text-right"
        >
          Skip the rest, I&rsquo;ll fill in the story bible later
        </button>
      </div>

      <Ticks value={progress} total={totalSteps} className="mb-3" />
      <p className="mono mb-8 text-ink-subtle">
        {Math.round(progress * 100)}% COMPLETE
      </p>

      <p className="mb-10 max-w-[52ch] text-ink-muted">{meta.blurb}</p>

      <div className="flex-1 space-y-10">
        {current.questions.map((q, i) => (
          <div key={q.id} className={i > 0 ? "border-t-2 border-line pt-10" : undefined}>
            <QuestionCard
              question={q}
              value={bible[current.section].answers[q.id] ?? emptyAnswer()}
              onChange={(value) => updateAnswer(q.id, current.section, value)}
            />
          </div>
        ))}
      </div>

      <div className="mt-10 flex items-center justify-between gap-3 border-t-2 border-line pt-6">
        <Button variant="secondary" onClick={goBack} disabled={step === 0}>
          Back
        </Button>
        <Button onClick={goNext} loading={saving}>
          {step < totalSteps - 1 ? "Next section" : "Finish & build story bible"}
        </Button>
      </div>
    </div>
  );
}
