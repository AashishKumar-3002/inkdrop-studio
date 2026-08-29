import { NextRequest } from "next/server";
import { getProject, saveProject } from "@/lib/store";
import { buildChapterPrompt } from "@/lib/ai/promptBuilder";
import { getProvider, resolveApiKey } from "@/lib/ai/providers";
import { summarizeChapter } from "@/lib/ai/summarize";

export const runtime = "nodejs";

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string; chapterId: string }> }
) {
  const { id, chapterId } = await params;
  const project = getProject(id);
  if (!project) {
    return new Response(JSON.stringify({ error: "not found" }), { status: 404 });
  }
  const chapter = project.chapters.find((c) => c.id === chapterId);
  if (!chapter) {
    return new Response(JSON.stringify({ error: "chapter not found" }), { status: 404 });
  }
  if (chapter.locked) {
    return new Response(
      JSON.stringify({ error: "This chapter is locked. Unlock it before regenerating." }),
      { status: 409 }
    );
  }

  const { provider: providerIdOverride, model: modelOverride } = await req
    .json()
    .catch(() => ({}));

  const providerId = providerIdOverride || project.aiSettings.provider;
  const provider = getProvider(providerId);
  const model = modelOverride || project.aiSettings.model || provider.defaultModel;
  const apiKey = resolveApiKey(providerId, project.aiSettings.apiKeys);

  if (!apiKey) {
    return new Response(
      JSON.stringify({
        error: `No API key configured for ${provider.label}. Add one in Settings, or set the matching environment variable.`,
      }),
      { status: 400 }
    );
  }

  const { system, user } = buildChapterPrompt(project, chapterId);

  chapter.status = "generating";
  saveProject(project);

  const encoder = new TextEncoder();
  let full = "";

  const stream = new ReadableStream({
    async start(controller) {
      try {
        full = await provider.generateChapter({
          apiKey,
          model,
          systemPrompt: system,
          userPrompt: user,
          onChunk: (chunk) => {
            controller.enqueue(encoder.encode(chunk));
          },
        });

        const freshProject = getProject(id);
        if (freshProject) {
          const freshChapter = freshProject.chapters.find((c) => c.id === chapterId);
          if (freshChapter) {
            freshChapter.content = full;
            freshChapter.status = "drafted";
            freshChapter.wordCount = full.trim()
              ? full.trim().split(/\s+/).length
              : 0;
            freshChapter.updatedAt = new Date().toISOString();
            saveProject(freshProject);
          }
        }

        // Hidden rolling "story so far" log — best-effort, never blocks the
        // response the user is reading.
        if (freshProject?.rollingSummary?.enabled && full.trim()) {
          try {
            const summary = await summarizeChapter(provider, {
              apiKey,
              model,
              title: chapter.title,
              content: full,
            });
            const latest = getProject(id);
            if (latest && summary) {
              latest.rollingSummary.entries = latest.rollingSummary.entries.filter(
                (e) => e.chapterIndex !== chapter.index
              );
              latest.rollingSummary.entries.push({
                chapterIndex: chapter.index,
                chapterTitle: chapter.title,
                summary,
                createdAt: new Date().toISOString(),
              });
              latest.rollingSummary.entries.sort((a, b) => a.chapterIndex - b.chapterIndex);
              const latestChapter = latest.chapters.find((c) => c.id === chapterId);
              if (latestChapter && !latestChapter.summary) {
                latestChapter.summary = summary;
              }
              saveProject(latest);
            }
          } catch {
            // Summarization is a nice-to-have; ignore failures.
          }
        }
      } catch (err) {
        const message = err instanceof Error ? err.message : "Generation failed";
        controller.enqueue(encoder.encode(`\n\n[Generation error: ${message}]`));
        const freshProject = getProject(id);
        if (freshProject) {
          const freshChapter = freshProject.chapters.find((c) => c.id === chapterId);
          if (freshChapter) {
            freshChapter.status = "idea";
            saveProject(freshProject);
          }
        }
      } finally {
        controller.close();
      }
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/plain; charset=utf-8",
      "Cache-Control": "no-cache",
    },
  });
}
