"use client";

import { useId } from "react";
import { Question } from "@/lib/questionnaire";
import { AnswerValue } from "@/lib/types";
import { Chip, Input, Textarea } from "@/components/ui";

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
  const headingId = useId();
  const inputId = useId();

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
    <div className="space-y-2.5">
      <div>
        <h3 id={headingId} className="text-[13px] font-medium text-ink">
          {question.prompt}
          {required && (
            <span className="ml-1 text-danger" aria-label="required">
              *
            </span>
          )}
        </h3>
        {question.helper && (
          <p className="mt-1 text-xs text-ink-muted">{question.helper}</p>
        )}
        {required && (
          <p className="mt-1 text-xs font-medium text-danger">Not answered yet</p>
        )}
      </div>

      {question.type === "text" ? (
        <Textarea
          id={inputId}
          aria-labelledby={headingId}
          rows={3}
          placeholder={question.customPlaceholder}
          value={value.custom}
          onChange={(e) => onChange({ ...value, custom: e.target.value })}
        />
      ) : (
        <div className="space-y-2">
          <div
            role="group"
            aria-labelledby={headingId}
            className="flex flex-wrap gap-1.5"
          >
            {question.options?.map((opt) => {
              const active = value.selected.includes(opt.id);
              return (
                <Chip
                  key={opt.id}
                  type="button"
                  selected={active}
                  onClick={() => toggle(opt.id)}
                >
                  {opt.label}
                </Chip>
              );
            })}
          </div>
          <Input
            type="text"
            aria-label="Or write your own answer"
            placeholder={question.customPlaceholder ?? "Or write your own..."}
            value={value.custom}
            onChange={(e) => onChange({ ...value, custom: e.target.value })}
          />
        </div>
      )}
    </div>
  );
}
