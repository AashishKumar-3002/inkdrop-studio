"use client";

import { useRef, useEffect, useState } from "react";
import { useParams } from "next/navigation";
import {
  DEEP_DIVE_QUESTIONS,
  ONBOARDING_QUESTIONS,
  SECTION_META,
} from "@/lib/questionnaire";
import { AnswerValue, SECTION_IDS, SectionId, StoryBible } from "@/lib/types";
import QuestionCard, { emptyAnswer } from "@/components/QuestionCard";
import { api } from "@/lib/api";

function isEmpty(answer: AnswerValue | undefined): boolean {
  return !answer || (answer.selected.length === 0 && !answer.custom.trim());
}

export default function BiblePage() {
  const { id } = useParams<{ id: string }>();
  const [bible, setBible] = useState<StoryBible | null>(null);
  const [openSection, setOpenSection] = useState<SectionId | null>("feel");
  const [openDeepDive, setOpenDeepDive] = useState<Record<string, boolean>>({});
  const [status, setStatus] = useState<"idle" | "saving" | "saved">("idle");

  const [showImport, setShowImport] = useState(false);
  const [importText, setImportText] = useState("");
  const [importing, setImporting] = useState(false);
  const [importResult, setImportResult] = useState<string | null>(null);
  const [importError, setImportError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    api.getProject(id).then((p) => setBible(p.storyBible));
  }, [id]);

  async function save(next: StoryBible) {
    setBible(next);
    setStatus("saving");
    await api.saveBible(id, next);
    setStatus("saved");
    setTimeout(() => setStatus("idle"), 1200);
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
    setImportError(null);
    setImportResult(null);
    try {
      const { project, filledCount } = await api.extractBibleFromText(id, importText);
      setBible(project.storyBible);
      setImportResult(
        filledCount > 0
          ? `Filled in ${filledCount} question${filledCount === 1 ? "" : "s"} from your text. Anything left with a red asterisk below still needs your input.`
          : "Couldn't confidently map anything from that text onto the questionnaire — you may need to fill more in by hand."
      );
      setImportText("");
    } catch (e) {
      setImportError(e instanceof Error ? e.message : "Import failed.");
    } finally {
      setImporting(false);
    }
  }

  if (!bible) {
    return <div className="p-16 text-center text-neutral-400">Loading...</div>;
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
    <div className="mx-auto w-full max-w-3xl px-6 py-10">
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-neutral-900">Story Bible</h1>
          <p className="mt-1 text-sm text-neutral-500">
            Everything here is used as context whenever a chapter is generated.
            Edit anytime — nothing is locked in.
            {totalMissing > 0 && (
              <span className="ml-1 text-red-500">
                {totalMissing} essential question{totalMissing === 1 ? "" : "s"} still
                unanswered.
              </span>
            )}
          </p>
        </div>
        <span className="text-xs text-neutral-400">
          {status === "saving" ? "Saving..." : status === "saved" ? "Saved" : ""}
        </span>
      </div>

      <div className="mb-6 rounded-2xl border border-neutral-200 bg-white p-5 shadow-sm">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-sm font-medium text-neutral-700">
              Already have a story bible?
            </h2>
            <p className="text-xs text-neutral-400">
              Paste your notes, or upload a story-bible.md / text file — Inkdrop will
              map what it can onto the questionnaire below.
            </p>
          </div>
          <div className="flex gap-2">
            <button
              onClick={() => fileInputRef.current?.click()}
              className="rounded-xl border border-neutral-300 px-3 py-1.5 text-xs text-neutral-700 hover:border-neutral-500"
            >
              Upload file
            </button>
            <button
              onClick={() => setShowImport((s) => !s)}
              className="rounded-xl border border-neutral-300 px-3 py-1.5 text-xs text-neutral-700 hover:border-neutral-500"
            >
              {showImport ? "Hide" : "Paste text"}
            </button>
          </div>
          <input
            ref={fileInputRef}
            type="file"
            accept=".md,.txt,text/plain,text/markdown"
            className="hidden"
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
            <textarea
              className="w-full rounded-xl border border-neutral-300 p-3 text-sm focus:border-neutral-900 focus:outline-none"
              rows={8}
              placeholder="Paste your story bible, notes, or a paragraph describing your novel..."
              value={importText}
              onChange={(e) => setImportText(e.target.value)}
            />
            <div className="flex items-center justify-between">
              <div className="text-xs">
                {importError && <span className="text-red-500">{importError}</span>}
                {importResult && <span className="text-neutral-500">{importResult}</span>}
              </div>
              <button
                onClick={runImport}
                disabled={importing || !importText.trim()}
                className="rounded-xl bg-neutral-900 px-4 py-2 text-sm font-medium text-white hover:bg-neutral-700 disabled:opacity-50"
              >
                {importing ? "Reading..." : "Extract answers"}
              </button>
            </div>
          </div>
        )}
      </div>

      <div className="space-y-3">
        {SECTION_IDS.map((sectionId) => {
          const meta = SECTION_META[sectionId];
          const essentials = ONBOARDING_QUESTIONS.filter((q) => q.section === sectionId);
          const deepDive = DEEP_DIVE_QUESTIONS.filter((q) => q.section === sectionId);
          const isOpen = openSection === sectionId;
          const showDeepDive = openDeepDive[sectionId];
          const missing = missingBySection[sectionId];

          return (
            <div
              key={sectionId}
              className="overflow-hidden rounded-2xl border border-neutral-200 bg-white shadow-sm"
            >
              <button
                onClick={() => setOpenSection(isOpen ? null : sectionId)}
                className="flex w-full items-center justify-between px-5 py-4 text-left"
              >
                <div>
                  <div className="flex items-center gap-2 font-medium text-neutral-900">
                    {meta.label}
                    {missing > 0 && (
                      <span className="rounded-full bg-red-50 px-2 py-0.5 text-xs text-red-500">
                        {missing} missing
                      </span>
                    )}
                  </div>
                  <div className="text-xs text-neutral-400">{meta.blurb}</div>
                </div>
                <span className="text-neutral-400">{isOpen ? "−" : "+"}</span>
              </button>

              {isOpen && (
                <div className="space-y-8 border-t border-neutral-100 px-5 py-6">
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
                    <label className="mb-1 block text-sm font-medium text-neutral-700">
                      Freeform notes for this section
                    </label>
                    <textarea
                      className="w-full rounded-xl border border-neutral-300 p-3 text-sm focus:border-neutral-900 focus:outline-none"
                      rows={3}
                      placeholder="Anything else worth capturing here..."
                      defaultValue={bible[sectionId].notes}
                      onBlur={(e) => updateNotes(sectionId, e.target.value)}
                    />
                  </div>

                  {deepDive.length > 0 && (
                    <div className="border-t border-dashed border-neutral-200 pt-5">
                      <button
                        onClick={() =>
                          setOpenDeepDive((prev) => ({
                            ...prev,
                            [sectionId]: !prev[sectionId],
                          }))
                        }
                        className="text-sm font-medium text-neutral-500 underline hover:text-neutral-800"
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
            </div>
          );
        })}
      </div>
    </div>
  );
}
