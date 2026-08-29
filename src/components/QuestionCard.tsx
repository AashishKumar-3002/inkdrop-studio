"use client";

import { Question } from "@/lib/questionnaire";
import { AnswerValue } from "@/lib/types";

export function emptyAnswer(): AnswerValue {
  return { selected: [], custom: "" };
}

export default function QuestionCard({
  question,
  value,
  onChange,
  required,
}: {
  question: Question;
  value: AnswerValue;
  onChange: (value: AnswerValue) => void;
  /** Shows a red asterisk + note when true and the question is unanswered. */
  required?: boolean;
}) {
  const toggle = (optionId: string) => {
    if (question.type === "single") {
      onChange({ ...value, selected: [optionId] });
      return;
    }
    const isSelected = value.selected.includes(optionId);
    onChange({
      ...value,
      selected: isSelected
        ? value.selected.filter((id) => id !== optionId)
        : [...value.selected, optionId],
    });
  };

  return (
    <div className="space-y-3">
      <div>
        <h3 className="text-lg font-medium text-neutral-900">
          {question.prompt}
          {required && <span className="ml-1 text-red-500">*</span>}
        </h3>
        {question.helper && (
          <p className="mt-1 text-sm text-neutral-500">{question.helper}</p>
        )}
        {required && (
          <p className="mt-1 text-xs text-red-500">Not answered yet</p>
        )}
      </div>

      {question.type === "text" ? (
        <textarea
          className="w-full rounded-xl border border-neutral-300 p-3 text-sm focus:border-neutral-900 focus:outline-none"
          rows={3}
          placeholder={question.customPlaceholder}
          value={value.custom}
          onChange={(e) => onChange({ ...value, custom: e.target.value })}
        />
      ) : (
        <>
          <div className="flex flex-wrap gap-2">
            {question.options?.map((opt) => {
              const active = value.selected.includes(opt.id);
              return (
                <button
                  key={opt.id}
                  type="button"
                  onClick={() => toggle(opt.id)}
                  className={`rounded-full border px-4 py-2 text-sm transition ${
                    active
                      ? "border-neutral-900 bg-neutral-900 text-white"
                      : "border-neutral-300 bg-white text-neutral-700 hover:border-neutral-500"
                  }`}
                >
                  {opt.label}
                </button>
              );
            })}
          </div>
          <input
            type="text"
            className="w-full rounded-xl border border-neutral-300 p-2.5 text-sm focus:border-neutral-900 focus:outline-none"
            placeholder={question.customPlaceholder ?? "Or write your own..."}
            value={value.custom}
            onChange={(e) => onChange({ ...value, custom: e.target.value })}
          />
        </>
      )}
    </div>
  );
}
