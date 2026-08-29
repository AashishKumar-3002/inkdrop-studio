import { NextRequest, NextResponse } from "next/server";
import { createProject, listProjects } from "@/lib/store";

export async function GET() {
  return NextResponse.json(listProjects());
}

export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => ({}));
  const project = createProject(body.name ?? "Untitled Novel");
  return NextResponse.json(project, { status: 201 });
}
