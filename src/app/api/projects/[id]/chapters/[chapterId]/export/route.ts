import { NextRequest, NextResponse } from "next/server";
import { getChapter } from "@/lib/repo/projects";
import { buildMarkdown } from "@/lib/export/markdown";
import { buildPdf } from "@/lib/export/pdf";
import { buildEpub } from "@/lib/export/epub";
import { ApiProblem, handle, notFound, requireChapterContext } from "@/lib/apiHelpers";

export const runtime = "nodejs";
export const maxDuration = 120;

function slug(text: string) {
  return text.replace(/[^a-z0-9-_]+/gi, "_").slice(0, 60) || "chapter";
}

export async function GET(
  req: NextRequest,
  ctx: { params: Promise<{ id: string; chapterId: string }> }
) {
  return handle(async () => {
    const { userId, project, chapterId } = await requireChapterContext(ctx);
    const found = await getChapter(project.id, chapterId, userId);
    if (!found) return notFound("Chapter not found.");
    const { chapter } = found;

    const format = (req.nextUrl.searchParams.get("format") || "md").toLowerCase();
    const book = {
      title: chapter.title,
      author: project.book?.author || undefined,
      chapters: [{ title: chapter.title, content: chapter.content || "(empty chapter)" }],
    };
    const filename = slug(chapter.title);

    if (format === "md") {
      return new NextResponse(buildMarkdown(book), {
        headers: {
          "Content-Type": "text/markdown; charset=utf-8",
          "Content-Disposition": `attachment; filename="${filename}.md"`,
        },
      });
    }
    if (format === "pdf") {
      const buffer = await buildPdf(book);
      return new NextResponse(new Uint8Array(buffer), {
        headers: {
          "Content-Type": "application/pdf",
          "Content-Disposition": `attachment; filename="${filename}.pdf"`,
        },
      });
    }
    if (format === "epub") {
      const buffer = await buildEpub(book);
      return new NextResponse(new Uint8Array(buffer), {
        headers: {
          "Content-Type": "application/epub+zip",
          "Content-Disposition": `attachment; filename="${filename}.epub"`,
        },
      });
    }
    throw new ApiProblem(400, "Unsupported format. Use md, pdf or epub.");
  });
}
