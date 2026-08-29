import { NextRequest, NextResponse } from "next/server";
import { randomUUID } from "crypto";
import { getProject, saveProject } from "@/lib/store";
import { Chapter, ChapterStatus } from "@/lib/types";

function wordCount(text: string): number {
  return text.trim() ? text.trim().split(/\s+/).length : 0;
}

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const project = getProject(id);
  if (!project) return NextResponse.json({ error: "not found" }, { status: 404 });
  const body = await req.json().catch(() => ({}));
  const now = new Date().toISOString();
  const content: string = body.content || "";
  const status: ChapterStatus = body.status || (content ? "drafted" : "idea");
  const chapter: Chapter = {
    id: randomUUID(),
    index: project.chapters.length + 1,
    title: body.title || `Chapter ${project.chapters.length + 1}`,
    idea: body.idea || "",
    content,
    summary: "",
    status,
    wordCount: wordCount(content),
    locked: false,
    mode: body.mode === "manual" ? "manual" : "ai",
    createdAt: now,
    updatedAt: now,
  };
  project.chapters.push(chapter);
  saveProject(project);
  return NextResponse.json(chapter, { status: 201 });
}
