import { NextRequest, NextResponse } from "next/server";
import { deleteProject, toClientProject, updateProject } from "@/lib/repo/projects";
import { updateProjectSchema } from "@/lib/validation";
import { handle, notFound, parseBody, requireProject } from "@/lib/apiHelpers";

export const runtime = "nodejs";

export async function GET(_req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  return handle(async () => {
    const { project } = await requireProject(ctx, { withChapters: true });
    return NextResponse.json(toClientProject(project));
  });
}

export async function PATCH(req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  return handle(async () => {
    const { userId, project } = await requireProject(ctx);
    const patch = await parseBody(req, updateProjectSchema);
    const updated = await updateProject(project.id, userId, patch);
    if (!updated) return notFound("Project not found.");
    return NextResponse.json(toClientProject(updated));
  });
}

export async function DELETE(
  _req: NextRequest,
  ctx: { params: Promise<{ id: string }> }
) {
  return handle(async () => {
    const { userId, project } = await requireProject(ctx);
    const ok = await deleteProject(project.id, userId);
    if (!ok) return notFound("Project not found.");
    return NextResponse.json({ ok: true });
  });
}
