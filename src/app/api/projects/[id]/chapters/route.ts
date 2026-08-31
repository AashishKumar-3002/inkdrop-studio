import { NextRequest, NextResponse } from "next/server";
import { createChapter, createChapters } from "@/lib/repo/projects";
import { bulkChaptersSchema, createChapterSchema } from "@/lib/validation";
import { ApiProblem, handle, requireProject } from "@/lib/apiHelpers";

export const runtime = "nodejs";

/**
 * Creates one chapter, or several at once when the body carries a
 * `chapters` array (the bulk file upload flow).
 */
export async function POST(req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  return handle(async () => {
    const { project } = await requireProject(ctx);

    let raw: unknown;
    try {
      raw = await req.json();
    } catch {
      throw new ApiProblem(400, "Expected a JSON body.");
    }

    if (raw && typeof raw === "object" && Array.isArray((raw as { chapters?: unknown }).chapters)) {
      const { chapters } = bulkChaptersSchema.parse(raw);
      const created = await createChapters(project.id, chapters);
      return NextResponse.json({ chapters: created }, { status: 201 });
    }

    const body = createChapterSchema.parse(raw ?? {});
    const chapter = await createChapter(project.id, body);
    return NextResponse.json(chapter, { status: 201 });
  });
}
