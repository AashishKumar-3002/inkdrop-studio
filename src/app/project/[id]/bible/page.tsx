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
  Display,
  ErrorState,
  Kicker,
  LoadingState,
  Rule,
  RuledRow,
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
      <div className="mx-auto w-full max-w-4xl px-4 py-10 sm:px-10">
        <ErrorState message={loadError} onRetry={retry} />
      </div>
    );
  }

  if (!bible) {
    return (
      <div className="mx-auto w-full max-w-4xl px-4 py-10 sm:px-10">
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
    <div className="mx-auto w-full max-w-4xl px-4 py-10 sm:px-10">
      <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <Kicker className="mb-3">Everything the drafts are grounded in</Kicker>
          <Display size={52}>Story bible</Display>
        </div>
        <span
          className="mono text-ink-subtle sm:text-right"
          role="status"
          aria-live="polite"
        >
          {status === "saving" ? "SAVING…" : status === "saved" ? "SAVED" : ""}
        </span>
      </div>

      <p className="mb-8 max-w-[56ch] text-ink-muted">
        Everything here is used as context whenever a chapter is generated. Edit
        anytime — nothing is locked in.
        {totalMissing > 0 && (
          <span className="ml-1 text-danger-ink">
            {totalMissing} essential question{totalMissing === 1 ? "" : "s"} still
            unanswered.
          </span>
        )}
      </p>

      <Card className="mb-10 p-5">
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

      <div>
        {SECTION_IDS.map((sectionId, i) => {
          const meta = SECTION_META[sectionId];
          const essentials = ONBOARDING_QUESTIONS.filter((q) => q.section === sectionId);
          const deepDive = DEEP_DIVE_QUESTIONS.filter((q) => q.section === sectionId);
          const isOpen = openSection === sectionId;
          const showDeepDive = openDeepDive[sectionId];
          const missing = missingBySection[sectionId];
          const total = essentials.length;
          const answered = total - missing;
          const panelId = `bible-section-${sectionId}`;

          return (
            <RuledRow key={sectionId} index={String(i + 1).padStart(2, "0")}>
              <button
                onClick={() => setOpenSection(isOpen ? null : sectionId)}
                className="flex w-full items-center justify-between gap-3 text-left"
                aria-expanded={isOpen}
                aria-controls={panelId}
              >
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2 font-medium text-ink">
                    {meta.label}
                    <Badge tone={missing > 0 ? "outline" : "accent"}>
                      <span className="tnum">
                        {answered}/{total}
                      </span>
                    </Badge>
                  </div>
                  <div className="mt-1 text-xs text-ink-subtle">{meta.blurb}</div>
                </div>
                <ChevronDown
                  className={`h-4 w-4 shrink-0 text-ink-subtle transition-transform ${
                    isOpen ? "rotate-180" : ""
                  }`}
                  aria-hidden
                />
              </button>

              {isOpen && (
                <div id={panelId} className="mt-6 space-y-8 border-t border-hair pt-6">
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
                      className="mb-1.5 block text-xs text-ink-muted"
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
                    <div className="border-t border-hair pt-5">
                      <button
                        onClick={() =>
                          setOpenDeepDive((prev) => ({
                            ...prev,
                            [sectionId]: !prev[sectionId],
                          }))
                        }
                        className="lbl text-accent-700 underline underline-offset-2 hover:text-accent"
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
            </RuledRow>
          );
        })}
        <Rule />
      </div>
    </div>
  );
}
