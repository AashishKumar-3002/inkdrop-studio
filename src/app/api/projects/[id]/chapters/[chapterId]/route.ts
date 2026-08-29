import { NextRequest, NextResponse } from "next/server";
import { getProject, saveProject } from "@/lib/store";

/** Fields that a locked chapter refuses to have changed, unless the same
 * patch is also unlocking it. */
const PROTECTED_FIELDS = ["idea", "content", "title"] as const;

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string; chapterId: string }> }
) {
  const { id, chapterId } = await params;
  const project = getProject(id);
  if (!project) return NextResponse.json({ error: "not found" }, { status: 404 });
  const chapter = project.chapters.find((c) => c.id === chapterId);
  if (!chapter) return NextResponse.json({ error: "chapter not found" }, { status: 404 });
  const patch = await req.json();

  const isUnlocking = patch.locked === false;
  if (chapter.locked && !isUnlocking) {
    const attemptsProtectedEdit = PROTECTED_FIELDS.some(
      (field) => field in patch && patch[field] !== chapter[field]
    );
    if (attemptsProtectedEdit) {
      return NextResponse.json(
        { error: "This chapter is locked. Unlock it before editing." },
        { status: 409 }
      );
    }
  }

  Object.assign(chapter, patch);
  if (typeof chapter.content === "string") {
    chapter.wordCount = chapter.content.trim()
      ? chapter.content.trim().split(/\s+/).length
      : 0;
  }
  chapter.updatedAt = new Date().toISOString();
  saveProject(project);
  return NextResponse.json(chapter);
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string; chapterId: string }> }
) {
  const { id, chapterId } = await params;
  const project = getProject(id);
  if (!project) return NextResponse.json({ error: "not found" }, { status: 404 });
  const chapter = project.chapters.find((c) => c.id === chapterId);
  if (chapter?.locked) {
    return NextResponse.json(
      { error: "This chapter is locked. Unlock it before deleting." },
      { status: 409 }
    );
  }
  project.chapters = project.chapters.filter((c) => c.id !== chapterId);
  project.chapters.forEach((c, i) => (c.index = i + 1));
  saveProject(project);
  return NextResponse.json({ ok: true });
}
