import { NextRequest } from "next/server";
import {
  getChapter,
  getProject,
  updateChapter,
  updateProject,
} from "@/lib/repo/projects";
import { buildChapterPrompt } from "@/lib/ai/promptBuilder";
import { getProvider, resolveApiKey } from "@/lib/ai/providers";
import { summarizeChapter } from "@/lib/ai/summarize";
import { generateChapterSchema } from "@/lib/validation";
import { ApiProblem, handle, notFound, parseBody, requireChapterContext } from "@/lib/apiHelpers";

export const runtime = "nodejs";
/** Chapter generation runs far longer than the default serverless budget. */
export const maxDuration = 300;

export async function POST(
  req: NextRequest,
  ctx: { params: Promise<{ id: string; chapterId: string }> }
) {
  return handle(async () => {
    const { userId, chapterId } = await requireChapterContext(ctx);
    // The prompt builder needs the full project (bible + prior chapters).
    const { project } = await requireChapterContext(ctx, { withChapters: true });
    const found = await getChapter(project.id, chapterId, userId);
    if (!found) return notFound("Chapter not found.");
    const { chapter } = found;

    if (chapter.locked) {
      throw new ApiProblem(409, "This chapter is locked. Unlock it before regenerating.");
    }

    const body = await parseBody(req, generateChapterSchema).catch(() => ({
      provider: undefined,
      model: undefined,
    }));

    const providerId = body.provider ?? project.aiSettings.provider;
    const provider = getProvider(providerId);
    const model = body.model || project.aiSettings.model || provider.defaultModel;
    const apiKey = resolveApiKey(providerId, project.aiSettings.apiKeys);

    if (!apiKey && providerId === "claude-subscription") {
      throw new ApiProblem(
        400,
        "Claude subscription mode only works in the Inkdrop desktop app, which can sign in with your Claude account locally. Pick a provider with an API key instead."
      );
    }
    if (!apiKey) {
      throw new ApiProblem(
        400,
        `No API key configured for ${provider.label}. Add one in Settings, or set ${
          providerId === "anthropic" ? "ANTHROPIC_API_KEY" : "the matching environment variable"
        }.`
      );
    }

    const { system, user } = buildChapterPrompt(project, chapterId);

    await updateChapter(project.id, chapterId, { status: "generating" });

    const encoder = new TextEncoder();
    // Abort the upstream model call if the reader goes away (tab closed,
    // navigation) instead of paying for tokens nobody will ever see.
    const abort = new AbortController();
    req.signal.addEventListener("abort", () => abort.abort());

    const stream = new ReadableStream({
      async start(controller) {
        let full = "";
        try {
          full = await provider.generateChapter({
            apiKey,
            model,
            systemPrompt: system,
            userPrompt: user,
            signal: abort.signal,
            onChunk: (chunk) => {
              controller.enqueue(encoder.encode(chunk));
            },
          });

          await updateChapter(project.id, chapterId, {
            content: full,
            status: "drafted",
          });

          // Hidden rolling "story so far" log — best effort, and never
          // allowed to fail the response the author is already reading.
          if (project.rollingSummary?.enabled && full.trim()) {
            try {
              const summary = await summarizeChapter(provider, {
                apiKey,
                model,
                title: chapter.title,
                content: full,
              });
              const latest = await getProject(project.id, userId);
              if (latest && summary) {
                const entries = latest.rollingSummary.entries.filter(
                  (e) => e.chapterIndex !== chapter.index
                );
                entries.push({
                  chapterIndex: chapter.index,
                  chapterTitle: chapter.title,
                  summary,
                  createdAt: new Date().toISOString(),
                });
                entries.sort((a, b) => a.chapterIndex - b.chapterIndex);
                await updateProject(project.id, userId, {
                  rollingSummary: { ...latest.rollingSummary, entries },
                });
                if (!chapter.summary) {
                  await updateChapter(project.id, chapterId, { summary });
                }
              }
            } catch {
              // Summarization is a nice-to-have; ignore failures.
            }
          }
        } catch (err) {
          if (abort.signal.aborted) {
            // Client hung up. Persist whatever streamed so the work isn't lost.
            await updateChapter(project.id, chapterId, {
              content: full,
              status: full.trim() ? "drafted" : "idea",
            }).catch(() => {});
          } else {
            const message = err instanceof Error ? err.message : "Generation failed";
            controller.enqueue(encoder.encode(`\n\n[Generation error: ${message}]`));
            await updateChapter(project.id, chapterId, {
              status: full.trim() ? "drafted" : "idea",
              ...(full.trim() ? { content: full } : {}),
            }).catch(() => {});
          }
        } finally {
          controller.close();
        }
      },
    });

    return new Response(stream, {
      headers: {
        "Content-Type": "text/plain; charset=utf-8",
        "Cache-Control": "no-cache, no-transform",
        "X-Accel-Buffering": "no",
      },
    });
  });
}
