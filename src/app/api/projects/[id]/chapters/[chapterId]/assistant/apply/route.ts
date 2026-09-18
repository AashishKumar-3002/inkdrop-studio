import { NextRequest, NextResponse } from "next/server";
import { handle, notFound, parseBody, requireChapterContext } from "@/lib/apiHelpers";
import { assistantApplySchema } from "@/lib/chapterAssistant";
import { applyAssistantResult } from "@/lib/repo/chapterAssistant";
import { getChapter } from "@/lib/repo/projects";
export const runtime = "nodejs";
export async function POST(req: NextRequest, ctx: { params: Promise<{ id: string; chapterId: string }> }) {
  return handle(async () => {
    const { project, chapterId, userId } = await requireChapterContext(ctx);
    const input = await parseBody(req, assistantApplySchema);
    const version = await applyAssistantResult(project.id, chapterId, userId, input.entryId, input.expectedContent, input.acceptedChanges);
    const updated = await getChapter(project.id, chapterId, userId);
    if (!updated) return notFound("Chapter not found.");
    return NextResponse.json({ chapter: updated.chapter, version });
  });
}
