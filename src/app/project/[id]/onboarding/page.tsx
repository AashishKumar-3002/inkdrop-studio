"use client";

import { useEffect, useMemo, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { ONBOARDING_STEPS, SECTION_META } from "@/lib/questionnaire";
import { AnswerValue, emptyStoryBible, StoryBible } from "@/lib/types";
import QuestionCard, { emptyAnswer } from "@/components/QuestionCard";
import { api } from "@/lib/api";

export default function OnboardingPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const [bible, setBible] = useState<StoryBible>(emptyStoryBible());
  const [projectName, setProjectName] = useState("");
  const [step, setStep] = useState(0);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    api.getProject(id).then((p) => {
      setBible(p.storyBible);
      setProjectName(p.name);
      setLoading(false);
    });
  }, [id]);

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
    } finally {
      setSaving(false);
    }
  }

  async function goNext() {
    await persist(false);
    if (step < totalSteps - 1) {
      setStep((s) => s + 1);
    } else {
      await persist(true);
      router.push(`/project/${id}/chapters`);
    }
  }

  function goBack() {
    if (step > 0) setStep((s) => s - 1);
  }

  async function skipToEnd() {
    await persist(true);
    router.push(`/project/${id}/chapters`);
  }

  if (loading) {
    return <div className="p-16 text-center text-neutral-400">Loading...</div>;
  }

  const meta = SECTION_META[current.section];

  return (
    <div className="mx-auto flex w-full max-w-2xl flex-1 flex-col px-6 py-12">
      <div className="mb-8">
        <div className="mb-2 flex items-center justify-between text-xs text-neutral-400">
          <span>
            Setting up &ldquo;{projectName}&rdquo; — Step {step + 1} of {totalSteps}
          </span>
          <button
            onClick={skipToEnd}
            className="text-neutral-400 underline hover:text-neutral-600"
          >
            Skip the rest, I&apos;ll fill in the story bible later
          </button>
        </div>
        <div className="h-1.5 w-full overflow-hidden rounded-full bg-neutral-200">
          <div
            className="h-full rounded-full bg-neutral-900 transition-all"
            style={{ width: `${progress}%` }}
          />
        </div>
      </div>

      <div className="mb-8">
        <h1 className="text-2xl font-semibold text-neutral-900">{meta.label}</h1>
        <p className="mt-1 text-neutral-500">{meta.blurb}</p>
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

      <div className="mt-10 flex items-center justify-between border-t border-neutral-200 pt-6">
        <button
          onClick={goBack}
          disabled={step === 0}
          className="rounded-xl px-4 py-2 text-sm text-neutral-600 disabled:opacity-30"
        >
          Back
        </button>
        <button
          onClick={goNext}
          disabled={saving}
          className="rounded-xl bg-neutral-900 px-6 py-2.5 text-sm font-medium text-white hover:bg-neutral-700 disabled:opacity-50"
        >
          {saving
            ? "Saving..."
            : step < totalSteps - 1
            ? "Next"
            : "Finish & build story bible"}
        </button>
      </div>
    </div>
  );
}
