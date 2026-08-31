import { NextRequest, NextResponse } from "next/server";
import { buildMarkdown } from "@/lib/export/markdown";
import { buildPdf } from "@/lib/export/pdf";
import { buildEpub } from "@/lib/export/epub";
import { ApiProblem, handle, requireProject } from "@/lib/apiHelpers";

export const runtime = "nodejs";
export const maxDuration = 120;

function slug(text: string) {
  return text.replace(/[^a-z0-9-_]+/gi, "_").slice(0, 60) || "book";
}

export async function GET(req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  return handle(async () => {
    const { project } = await requireProject(ctx, { withChapters: true });

    const format = (req.nextUrl.searchParams.get("format") || "epub").toLowerCase();
    const onlyFinal = req.nextUrl.searchParams.get("onlyFinal") === "1";
    const chapters = project.chapters
      .slice()
      .sort((a, b) => a.index - b.index)
      .filter((c) => (onlyFinal ? c.status === "final" : c.content.trim().length > 0))
      .map((c) => ({ title: c.title, content: c.content || "" }));

    if (chapters.length === 0) {
      throw new ApiProblem(
        400,
        onlyFinal
          ? "No chapters are marked Final yet."
          : "No chapter content to export yet."
      );
    }

    const title = project.book?.title || project.name;
    const book = {
      title,
      author: project.book?.author || undefined,
      coverImageDataUrl: project.book?.coverImageDataUrl || undefined,
      chapters,
    };
    const filename = slug(title);

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
