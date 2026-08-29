import { NextRequest, NextResponse } from "next/server";
import { getProject, saveProject } from "@/lib/store";
import { getProvider, resolveApiKey } from "@/lib/ai/providers";
import { extractBibleAnswers } from "@/lib/ai/extractBible";
import { findQuestion } from "@/lib/questionnaire";
import { AnswerValue } from "@/lib/types";

function isEmpty(answer: AnswerValue | undefined): boolean {
  return !answer || (answer.selected.length === 0 && !answer.custom.trim());
}

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const project = getProject(id);
  if (!project) return NextResponse.json({ error: "not found" }, { status: 404 });

  const { text } = await req.json().catch(() => ({ text: "" }));
  if (!text || typeof text !== "string" || !text.trim()) {
    return NextResponse.json({ error: "No text provided." }, { status: 400 });
  }

  const provider = getProvider(project.aiSettings.provider);
  const model = project.aiSettings.model || provider.defaultModel;
  const apiKey = resolveApiKey(project.aiSettings.provider, project.aiSettings.apiKeys);
  if (!apiKey) {
    return NextResponse.json(
      {
        error: `No API key configured for ${provider.label}. Add one in Settings to use text import.`,
      },
      { status: 400 }
    );
  }

  const extracted = await extractBibleAnswers(provider, { apiKey, model, text });

  let filledCount = 0;
  for (const [qid, value] of Object.entries(extracted)) {
    const question = findQuestion(qid);
    if (!question) continue;
    const section = project.storyBible[question.section];
    const existing = section.answers[qid];
    // Never clobber an answer the author already gave.
    if (!isEmpty(existing)) continue;
    section.answers[qid] = value;
    filledCount++;
  }

  saveProject(project);
  return NextResponse.json({ project, filledCount });
}
