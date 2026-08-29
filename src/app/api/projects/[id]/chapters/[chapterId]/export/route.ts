import { NextRequest, NextResponse } from "next/server";
import { getProject } from "@/lib/store";
import { buildMarkdown } from "@/lib/export/markdown";
import { buildPdf } from "@/lib/export/pdf";
import { buildEpub } from "@/lib/export/epub";

export const runtime = "nodejs";

function slug(text: string) {
  return text.replace(/[^a-z0-9-_]+/gi, "_").slice(0, 60) || "chapter";
}

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string; chapterId: string }> }
) {
  const { id, chapterId } = await params;
  const project = getProject(id);
  if (!project) return NextResponse.json({ error: "not found" }, { status: 404 });
  const chapter = project.chapters.find((c) => c.id === chapterId);
  if (!chapter) return NextResponse.json({ error: "chapter not found" }, { status: 404 });

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
  return NextResponse.json({ error: "Unsupported format" }, { status: 400 });
}
