import { AIProvider } from "./types";
import { DEEP_DIVE_QUESTIONS, ONBOARDING_QUESTIONS, Question } from "../questionnaire";
import { AnswerValue } from "../types";

const ALL_QUESTIONS: Question[] = [...ONBOARDING_QUESTIONS, ...DEEP_DIVE_QUESTIONS];

function describeQuestionForPrompt(q: Question): string {
  const optionList = q.options?.map((o) => o.id).join(", ");
  return `- id: "${q.id}" | type: ${q.type} | prompt: "${q.prompt}"${
    optionList ? ` | valid option ids: [${optionList}]` : ""
  }`;
}

function extractJsonBlock(text: string): string {
  const fenced = /```(?:json)?\s*([\s\S]*?)```/.exec(text);
  if (fenced) return fenced[1];
  const first = text.indexOf("{");
  const last = text.lastIndexOf("}");
  if (first !== -1 && last !== -1) return text.slice(first, last + 1);
  return text;
}

export async function extractBibleAnswers(
  provider: AIProvider,
  opts: { apiKey: string; model: string; text: string }
): Promise<Record<string, AnswerValue>> {
  const { apiKey, model, text } = opts;

  const system = `You extract structured answers from an author's free-form story notes (a story bible document, or just paragraphs describing their novel) and map them onto a fixed questionnaire.

Return ONLY a single JSON object, no prose, no markdown fences. Keys are question ids from the list given. For each question you can confidently answer from the text, include:
{"selected": ["optionId1", ...], "custom": "short free text if useful, else empty string"}

Rules:
- Only use option ids from the given "valid option ids" list for that question — never invent ids.
- For "text" type questions, leave "selected" as [] and put the answer in "custom".
- Omit a question entirely if the text doesn't address it — do not guess.
- "custom" should be a concise paraphrase in the author's own terms, not a full quote unless short.`;

  const questionList = ALL_QUESTIONS.map(describeQuestionForPrompt).join("\n");
  const user = `QUESTIONNAIRE:\n${questionList}\n\nAUTHOR'S NOTES:\n"""\n${text.slice(0, 20000)}\n"""\n\nReturn the JSON object now.`;

  let full = "";
  await provider.generateChapter({
    apiKey,
    model,
    systemPrompt: system,
    userPrompt: user,
    onChunk: (chunk) => {
      full += chunk;
    },
  });

  let parsed: Record<string, { selected?: string[]; custom?: string }> = {};
  try {
    parsed = JSON.parse(extractJsonBlock(full));
  } catch {
    return {};
  }

  const validIds = new Set(ALL_QUESTIONS.map((q) => q.id));
  const result: Record<string, AnswerValue> = {};
  for (const [qid, value] of Object.entries(parsed)) {
    if (!validIds.has(qid) || !value || typeof value !== "object") continue;
    const question = ALL_QUESTIONS.find((q) => q.id === qid);
    const validOptionIds = new Set(question?.options?.map((o) => o.id) ?? []);
    const selected = Array.isArray(value.selected)
      ? value.selected.filter((id) => validOptionIds.has(id))
      : [];
    const custom = typeof value.custom === "string" ? value.custom : "";
    if (selected.length === 0 && !custom.trim()) continue;
    result[qid] = { selected, custom };
  }
  return result;
}
