import { NextRequest, NextResponse } from "next/server";
import { getProject } from "@/lib/store";
import { getProvider, resolveApiKey } from "@/lib/ai/providers";
import { renderStoryBible } from "@/lib/ai/promptBuilder";

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const project = getProject(id);
  if (!project) return NextResponse.json({ error: "not found" }, { status: 404 });

  const { vision } = await req.json().catch(() => ({ vision: "" }));

  const provider = getProvider(project.aiSettings.provider);
  const model = project.aiSettings.model || provider.defaultModel;
  const apiKey = resolveApiKey(project.aiSettings.provider, project.aiSettings.apiKeys);
  if (!apiKey) {
    return NextResponse.json(
      { error: `No API key configured for ${provider.label}. Add one in Settings.` },
      { status: 400 }
    );
  }

  const bibleBrief = renderStoryBible(project.storyBible);
  const storySoFar = project.rollingSummary.entries
    .slice(-6)
    .map((e) => `Ch.${e.chapterIndex} ${e.chapterTitle}: ${e.summary}`)
    .join("\n");

  const system = `You art-direct novel covers. Given a story bible and the story so far, propose exactly 3 distinct cover art directions. Each should be a single vivid, concrete paragraph written as a ready-to-use image-generation prompt: composition, subject, mood, palette, lighting, style. No titles, no numbering labels beyond order, no commentary — just the 3 prompts, separated by a line of "---".`;
  const user = `STORY BIBLE\n${bibleBrief || "(sparse)"}\n\nSTORY SO FAR\n${
    storySoFar || "(no chapters yet)"
  }\n\nAUTHOR'S VISION FOR THE COVER\n${vision?.trim() || "(no specific vision given — use your judgment)"}\n\nGive 3 cover art directions now.`;

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

  const directions = full
    .split(/\n?---\n?/)
    .map((s) => s.trim())
    .filter(Boolean)
    .slice(0, 3);

  return NextResponse.json({ directions });
}
