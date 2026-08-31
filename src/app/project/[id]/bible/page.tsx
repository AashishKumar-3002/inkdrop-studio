"use client";

import { useCallback, useRef, useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { toast } from "sonner";
import { ChevronDown, Upload } from "lucide-react";
import {
  DEEP_DIVE_QUESTIONS,
  ONBOARDING_QUESTIONS,
  SECTION_META,
} from "@/lib/questionnaire";
import { AnswerValue, SECTION_IDS, SectionId, StoryBible } from "@/lib/types";
import QuestionCard, { emptyAnswer } from "@/components/QuestionCard";
import { api } from "@/lib/api";
import {
  Badge,
  Button,
  Card,
  ErrorState,
  LoadingState,
  Textarea,
} from "@/components/ui";

function isEmpty(answer: AnswerValue | undefined): boolean {
  return !answer || (answer.selected.length === 0 && !answer.custom.trim());
}

export default function BiblePage() {
  const { id } = useParams<{ id: string }>();
  const [bible, setBible] = useState<StoryBible | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [openSection, setOpenSection] = useState<SectionId | null>("feel");
  const [openDeepDive, setOpenDeepDive] = useState<Record<string, boolean>>({});
  const [status, setStatus] = useState<"idle" | "saving" | "saved">("idle");

  const [showImport, setShowImport] = useState(false);
  const [importText, setImportText] = useState("");
  const [importing, setImporting] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const load = useCallback(() => {
    api
      .getProject(id)
      .then((p) => setBible(p.storyBible))
      .catch((e) => {
        setLoadError(e instanceof Error ? e.message : "Couldn't load this project.");
      });
  }, [id]);

    // The effect only kicks off the request; every setState lands in a
  // promise callback, satisfying React's no-sync-setState-in-effect rule.
  useEffect(() => {
    load();
  }, [load]);

  /** Retry from the error state — a click handler, so setState is fine. */
  const retry = useCallback(() => {
    setLoadError(null);
    setBible(null);
    load();
  }, [load]);

  async function save(next: StoryBible) {
    setBible(next);
    setStatus("saving");
    try {
      await api.saveBible(id, next);
      setStatus("saved");
      setTimeout(() => setStatus("idle"), 1200);
    } catch (e) {
      setStatus("idle");
      toast.error(e instanceof Error ? e.message : "Couldn't save your changes.");
    }
  }

  function updateAnswer(section: SectionId, qid: string, value: AnswerValue) {
    if (!bible) return;
    save({
      ...bible,
      [section]: {
        ...bible[section],
        answers: { ...bible[section].answers, [qid]: value },
      },
    });
  }

  function updateNotes(section: SectionId, notes: string) {
    if (!bible) return;
    save({ ...bible, [section]: { ...bible[section], notes } });
  }

  async function runImport() {
    if (!importText.trim()) return;
    setImporting(true);
    try {
      const { project, filledCount } = await api.extractBibleFromText(id, importText);
      setBible(project.storyBible);
      if (filledCount > 0) {
        toast.success(
          `Filled in ${filledCount} answer${filledCount === 1 ? "" : "s"} from your notes.`
        );
      } else {
        toast.error(
          "Couldn't confidently map anything from that text onto the questionnaire — you may need to fill more in by hand."
        );
      }
      setImportText("");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Import failed.");
    } finally {
      setImporting(false);
    }
  }

  if (loadError) {
    return (
      <div className="mx-auto w-full max-w-3xl px-4 py-10 sm:px-6">
        <ErrorState message={loadError} onRetry={retry} />
      </div>
    );
  }

  if (!bible) {
    return (
      <div className="mx-auto w-full max-w-3xl px-4 py-10 sm:px-6">
        <LoadingState label="Loading your story bible…" />
      </div>
    );
  }

  const missingBySection: Record<SectionId, number> = SECTION_IDS.reduce(
    (acc, sid) => {
      const essentials = ONBOARDING_QUESTIONS.filter((q) => q.section === sid);
      acc[sid] = essentials.filter((q) => isEmpty(bible[sid].answers[q.id])).length;
      return acc;
    },
    {} as Record<SectionId, number>
  );
  const totalMissing = Object.values(missingBySection).reduce((a, b) => a + b, 0);

  return (
    <div className="mx-auto w-full max-w-3xl px-4 py-10 sm:px-6">
      <div className="mb-6 flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-ink">Story Bible</h1>
          <p className="mt-1 text-sm text-ink-muted">
            Everything here is used as context whenever a chapter is generated. Edit
            anytime — nothing is locked in.
            {totalMissing > 0 && (
              <span className="ml-1 text-danger">
                {totalMissing} essential question{totalMissing === 1 ? "" : "s"} still
                unanswered.
              </span>
            )}
          </p>
        </div>
        <span className="text-xs text-ink-subtle" role="status" aria-live="polite">
          {status === "saving" ? "Saving…" : status === "saved" ? "Saved" : ""}
        </span>
      </div>

      <Card className="mb-6 p-5">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="min-w-0">
            <h2 className="text-sm font-medium text-ink">Already have a story bible?</h2>
            <p className="text-xs text-ink-subtle">
              Paste your notes, or upload a story-bible.md / text file — Inkdrop will map
              what it can onto the questionnaire below.
            </p>
          </div>
          <div className="flex shrink-0 gap-2">
            <Button
              variant="secondary"
              size="sm"
              onClick={() => fileInputRef.current?.click()}
            >
              <Upload className="h-3.5 w-3.5" />
              Upload file
            </Button>
            <Button
              variant="secondary"
              size="sm"
              onClick={() => setShowImport((s) => !s)}
            >
              {showImport ? "Hide" : "Paste text"}
            </Button>
          </div>
          <input
            ref={fileInputRef}
            type="file"
            accept=".md,.txt,text/plain,text/markdown"
            className="hidden"
            aria-label="Upload story bible file"
            onChange={async (e) => {
              const file = e.target.files?.[0];
              e.target.value = "";
              if (!file) return;
              const text = await file.text();
              setImportText(text);
              setShowImport(true);
            }}
          />
        </div>
        {showImport && (
          <div className="mt-4 space-y-3">
            <Textarea
              rows={8}
              aria-label="Paste your story bible or notes"
              placeholder="Paste your story bible, notes, or a paragraph describing your novel…"
              value={importText}
              onChange={(e) => setImportText(e.target.value)}
            />
            <div className="flex justify-end">
              <Button
                onClick={runImport}
                disabled={!importText.trim()}
                loading={importing}
              >
                Extract answers
              </Button>
            </div>
          </div>
        )}
      </Card>

      <div className="space-y-3">
        {SECTION_IDS.map((sectionId) => {
          const meta = SECTION_META[sectionId];
          const essentials = ONBOARDING_QUESTIONS.filter((q) => q.section === sectionId);
          const deepDive = DEEP_DIVE_QUESTIONS.filter((q) => q.section === sectionId);
          const isOpen = openSection === sectionId;
          const showDeepDive = openDeepDive[sectionId];
          const missing = missingBySection[sectionId];
          const panelId = `bible-section-${sectionId}`;

          return (
            <Card key={sectionId} className="overflow-hidden">
              <button
                onClick={() => setOpenSection(isOpen ? null : sectionId)}
                className="flex w-full items-center justify-between gap-3 px-5 py-4 text-left"
                aria-expanded={isOpen}
                aria-controls={panelId}
              >
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2 font-medium text-ink">
                    {meta.label}
                    {missing > 0 && (
                      <Badge tone="danger">{missing} missing</Badge>
                    )}
                  </div>
                  <div className="text-xs text-ink-subtle">{meta.blurb}</div>
                </div>
                <ChevronDown
                  className={`h-4 w-4 shrink-0 text-ink-subtle transition-transform ${
                    isOpen ? "rotate-180" : ""
                  }`}
                  aria-hidden
                />
              </button>

              {isOpen && (
                <div
                  id={panelId}
                  className="space-y-8 border-t border-line px-5 py-6"
                >
                  {essentials.map((q) => (
                    <QuestionCard
                      key={q.id}
                      question={q}
                      value={bible[sectionId].answers[q.id] ?? emptyAnswer()}
                      onChange={(value) => updateAnswer(sectionId, q.id, value)}
                      required={isEmpty(bible[sectionId].answers[q.id])}
                    />
                  ))}

                  <div>
                    <label
                      htmlFor={`${panelId}-notes`}
                      className="mb-1 block text-sm font-medium text-ink"
                    >
                      Freeform notes for this section
                    </label>
                    <Textarea
                      id={`${panelId}-notes`}
                      rows={3}
                      placeholder="Anything else worth capturing here…"
                      defaultValue={bible[sectionId].notes}
                      onBlur={(e) => updateNotes(sectionId, e.target.value)}
                    />
                  </div>

                  {deepDive.length > 0 && (
                    <div className="border-t border-dashed border-line pt-5">
                      <button
                        onClick={() =>
                          setOpenDeepDive((prev) => ({
                            ...prev,
                            [sectionId]: !prev[sectionId],
                          }))
                        }
                        className="text-sm font-medium text-ink-muted underline hover:text-ink"
                      >
                        {showDeepDive
                          ? "Hide deep-dive questions"
                          : `Go deeper (${deepDive.length} more optional questions)`}
                      </button>
                      {showDeepDive && (
                        <div className="mt-6 space-y-8">
                          {deepDive.map((q) => (
                            <QuestionCard
                              key={q.id}
                              question={q}
                              value={bible[sectionId].answers[q.id] ?? emptyAnswer()}
                              onChange={(value) => updateAnswer(sectionId, q.id, value)}
                            />
                          ))}
                        </div>
                      )}
                    </div>
                  )}
                </div>
              )}
            </Card>
          );
        })}
      </div>
    </div>
  );
}
