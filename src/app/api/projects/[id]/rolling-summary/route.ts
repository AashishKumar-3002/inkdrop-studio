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
  project.rollingSummary = { ...project.rollingSummary, ...patch };
  saveProject(project);
  return NextResponse.json(project);
}
