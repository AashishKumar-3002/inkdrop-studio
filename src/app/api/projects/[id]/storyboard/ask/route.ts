import { NextRequest, NextResponse } from "next/server";
import { getProject, saveProject } from "@/lib/store";
import { getProvider, resolveApiKey } from "@/lib/ai/providers";
import { renderStoryBible } from "@/lib/ai/promptBuilder";

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const project = getProject(id);
  if (!project) return NextResponse.json({ error: "not found" }, { status: 404 });

  const { question, canvasImageDataUrl } = await req.json().catch(() => ({}));
  if (!question || typeof question !== "string" || !question.trim()) {
    return NextResponse.json({ error: "No question provided." }, { status: 400 });
  }

  const provider = getProvider(project.aiSettings.provider);
  const model = project.aiSettings.model || provider.defaultModel;
  const apiKey = resolveApiKey(project.aiSettings.provider, project.aiSettings.apiKeys);
  if (!apiKey) {
    return NextResponse.json(
      { error: `No API key configured for ${provider.label}. Add one in Settings.` },
      { status: 400 }
    );
  }

  const notesText = project.storyboard.notes
    .filter((n) => n.text.trim())
    .map((n) => `- ${n.text.trim()}`)
    .join("\n");
  const hasDrawing = project.storyboard.strokes.length > 0;

  const bibleBrief = renderStoryBible(project.storyBible);
  const storySoFar = project.rollingSummary.entries
    .slice(-8)
    .map((e) => `Ch.${e.chapterIndex} ${e.chapterTitle}: ${e.summary}`)
    .join("\n");

  const system = `You are a sharp, honest developmental editor helping an author think through their novel on a storyboard/corkboard. Be concrete and specific — reference their actual characters, threads, and notes. Point out gaps, contradictions, or missed opportunities when relevant. Keep answers focused (a few short paragraphs or a tight list), never generic writing-advice filler.`;

  const user = `STORY BIBLE\n${bibleBrief || "(sparse)"}\n\nSTORY SO FAR\n${
    storySoFar || "(no chapters yet)"
  }\n\nSTICKY NOTES ON THE STORYBOARD\n${notesText || "(no text notes)"}\n${
    hasDrawing
      ? "\nThe author has also sketched something on the canvas — an image of it is attached; take it into account.\n"
      : ""
  }\nAUTHOR'S QUESTION\n${question.trim()}`;

  let full = "";
  await provider.generateChapter({
    apiKey,
    model,
    systemPrompt: system,
    userPrompt: user,
    imageDataUrl: hasDrawing ? canvasImageDataUrl : undefined,
    onChunk: (chunk) => {
      full += chunk;
    },
  });

  const now = new Date().toISOString();
  project.storyboard.chat.push(
    { role: "user", content: question.trim(), createdAt: now },
    { role: "assistant", content: full.trim(), createdAt: new Date().toISOString() }
  );
  saveProject(project);

  return NextResponse.json({ answer: full.trim(), chat: project.storyboard.chat });
}
