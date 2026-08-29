import { NextRequest, NextResponse } from "next/server";
import { importProject } from "@/lib/store";

/**
 * Imports a project from an exported `.inkdrop.json` file (see the matching
 * export in /api/projects/[id]/export). Always creates a new project with a
 * fresh id — importing never overwrites an existing one.
 */
export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => null);
  if (!body || typeof body !== "object") {
    return NextResponse.json({ error: "Invalid project file" }, { status: 400 });
  }
  if (!body.storyBible || !Array.isArray(body.chapters)) {
    return NextResponse.json(
      { error: "This doesn't look like an Inkdrop project export." },
      { status: 400 }
    );
  }
  const project = importProject(body, body.__importName);
  return NextResponse.json(project, { status: 201 });
}
