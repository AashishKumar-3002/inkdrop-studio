import { NextRequest, NextResponse } from "next/server";
import { deleteChapter, getChapter, updateChapter } from "@/lib/repo/projects";
import { updateChapterSchema } from "@/lib/validation";
import {
  handle,
  locked,
  notFound,
  parseBody,
  requireChapterContext,
} from "@/lib/apiHelpers";

export const runtime = "nodejs";

/** Fields a locked chapter refuses to have changed, unless the same patch
 * is also unlocking it. Enforced server-side, not just in the UI. */
const PROTECTED_FIELDS = ["idea", "content", "title"] as const;

export async function PATCH(
  req: NextRequest,
  ctx: { params: Promise<{ id: string; chapterId: string }> }
) {
  return handle(async () => {
    const { userId, project, chapterId } = await requireChapterContext(ctx);
    const found = await getChapter(project.id, chapterId, userId);
    if (!found) return notFound("Chapter not found.");
    const { chapter } = found;

    const patch = await parseBody(req, updateChapterSchema);

    const isUnlocking = patch.locked === false;
    if (chapter.locked && !isUnlocking) {
      const attemptsProtectedEdit = PROTECTED_FIELDS.some(
        (field) => field in patch && patch[field] !== chapter[field]
      );
      if (attemptsProtectedEdit) {
        return locked("This chapter is locked. Unlock it before editing.");
      }
    }

    const updated = await updateChapter(project.id, chapterId, patch);
    if (!updated) return notFound("Chapter not found.");
    return NextResponse.json(updated);
  });
}

export async function DELETE(
  _req: NextRequest,
  ctx: { params: Promise<{ id: string; chapterId: string }> }
) {
  return handle(async () => {
    const { userId, project, chapterId } = await requireChapterContext(ctx);
    const found = await getChapter(project.id, chapterId, userId);
    if (!found) return notFound("Chapter not found.");
    if (found.chapter.locked) {
      return locked("This chapter is locked. Unlock it before deleting.");
    }
    await deleteChapter(project.id, chapterId);
    return NextResponse.json({ ok: true });
  });
}
