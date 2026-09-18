import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { ApiProblem, handle, parseBody, requireChapterContext } from "@/lib/apiHelpers";
import { getChapter } from "@/lib/repo/projects";
import { assistantHistory, dismissAssistantResult, saveAssistantResult } from "@/lib/repo/chapterAssistant";
import { assistantRequestSchema } from "@/lib/chapterAssistant";
import { runChapterAssistant } from "@/lib/ai/chapterAssistant";
export const runtime = "nodejs";
export const maxDuration = 300;
type Context = { params: Promise<{ id: string; chapterId: string }> };
export async function GET(_req: NextRequest, ctx: Context) {
  return handle(async () => {
    const { project, chapterId, userId } = await requireChapterContext(ctx);
    if (!await getChapter(project.id, chapterId, userId)) throw new ApiProblem(404, "Chapter not found.");
    return NextResponse.json(await assistantHistory(project.id, chapterId, userId));
  });
}
export async function POST(req: NextRequest, ctx: Context) {
  return handle(async () => {
    const { project, chapterId, userId } = await requireChapterContext(ctx, { withChapters: true });
    const input = await parseBody(req, assistantRequestSchema);
    const payload = await runChapterAssistant(project, chapterId, input, req.signal);
    req.signal.throwIfAborted();
    return NextResponse.json(await saveAssistantResult(project.id, chapterId, userId, input.content, payload));
  });
}
export async function DELETE(req: NextRequest, ctx: Context) {
  return handle(async () => {
    const { project, chapterId, userId } = await requireChapterContext(ctx);
    const { entryId } = await parseBody(req, z.object({ entryId: z.string().min(1).max(100) }));
    await dismissAssistantResult(project.id, chapterId, userId, entryId);
    return NextResponse.json({ ok: true });
  });
}
