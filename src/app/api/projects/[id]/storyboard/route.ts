import { NextRequest, NextResponse } from "next/server";
import { getProject, saveProject } from "@/lib/store";

export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const project = getProject(id);
  if (!project) return NextResponse.json({ error: "not found" }, { status: 404 });
  const patch = await req.json();
  project.storyboard = {
    ...project.storyboard,
    notes: patch.notes ?? project.storyboard.notes,
    strokes: patch.strokes ?? project.storyboard.strokes,
  };
  saveProject(project);
  return NextResponse.json(project);
}
