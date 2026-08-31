import { NextRequest, NextResponse } from "next/server";
import { createProject, listProjects, toClientProject } from "@/lib/repo/projects";
import { createProjectSchema } from "@/lib/validation";
import { handle, parseBody, requireUserId } from "@/lib/apiHelpers";

export const runtime = "nodejs";

export async function GET() {
  return handle(async () => {
    const userId = await requireUserId();
    return NextResponse.json(await listProjects(userId));
  });
}

export async function POST(req: NextRequest) {
  return handle(async () => {
    const userId = await requireUserId();
    const { name } = await parseBody(req, createProjectSchema);
    const project = await createProject(userId, name ?? "Untitled Novel");
    return NextResponse.json(toClientProject(project), { status: 201 });
  });
}
