import { NextRequest, NextResponse } from "next/server";
import { getProject } from "@/lib/store";

/**
 * Exports the full project as a portable `.inkdrop.json` file — the format
 * accepted by POST /api/projects/import. This is the whole project: story
 * bible, chapters, settings (API keys included, since this is a local,
 * single-user prototype — the README calls this out).
 */
export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const project = getProject(id);
  if (!project) return NextResponse.json({ error: "not found" }, { status: 404 });

  const filename = `${project.name.replace(/[^a-z0-9-_]+/gi, "_") || "project"}.inkdrop.json`;
  return new NextResponse(JSON.stringify(project, null, 2), {
    headers: {
      "Content-Type": "application/json",
      "Content-Disposition": `attachment; filename="${filename}"`,
    },
  });
}
