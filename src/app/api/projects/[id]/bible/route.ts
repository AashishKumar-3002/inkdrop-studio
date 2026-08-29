import { NextRequest, NextResponse } from "next/server";
import { getProject, saveProject } from "@/lib/store";

export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const project = getProject(id);
  if (!project) return NextResponse.json({ error: "not found" }, { status: 404 });
  const body = await req.json();
  project.storyBible = body.storyBible ?? project.storyBible;
  if (typeof body.onboardingComplete === "boolean") {
    project.onboardingComplete = body.onboardingComplete;
  }
  saveProject(project);
  return NextResponse.json(project);
}
