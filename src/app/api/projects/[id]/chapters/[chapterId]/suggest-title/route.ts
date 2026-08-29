import { NextRequest, NextResponse } from "next/server";
import { getProject } from "@/lib/store";
import { getProvider, resolveApiKey } from "@/lib/ai/providers";

export async function POST(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string; chapterId: string }> }
) {
  const { id, chapterId } = await params;
  const project = getProject(id);
  if (!project) return NextResponse.json({ error: "not found" }, { status: 404 });
  const chapter = project.chapters.find((c) => c.id === chapterId);
  if (!chapter) return NextResponse.json({ error: "chapter not found" }, { status: 404 });

  const provider = getProvider(project.aiSettings.provider);
  const model = project.aiSettings.model || provider.defaultModel;
  const apiKey = resolveApiKey(project.aiSettings.provider, project.aiSettings.apiKeys);
  if (!apiKey) {
    return NextResponse.json(
      { error: `No API key configured for ${provider.label}. Add one in Settings.` },
      { status: 400 }
    );
  }

  const basis = chapter.content?.trim() || chapter.idea?.trim();
  if (!basis) {
    return NextResponse.json(
      { error: "This chapter has no content or idea yet to name it from." },
      { status: 400 }
    );
  }

  const system =
    "You title novel chapters. Given the chapter's text or premise, return ONE short, evocative chapter title (2-6 words). No quotes, no 'Chapter N', no explanation — just the title text.";
  const user = `Chapter content or idea:\n\n${basis.slice(0, 6000)}\n\nGive one chapter title.`;

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

  const title = full.trim().replace(/^["'“]|["'”]$/g, "").split("\n")[0].slice(0, 80);
  return NextResponse.json({ title: title || `Chapter ${chapter.index}` });
}
