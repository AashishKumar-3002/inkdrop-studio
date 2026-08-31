import { NextRequest, NextResponse } from "next/server";
import { toClientProject, updateProject } from "@/lib/repo/projects";
import { storyboardSchema } from "@/lib/validation";
import { handle, notFound, parseBody, requireProject } from "@/lib/apiHelpers";

export const runtime = "nodejs";

export async function PUT(req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  return handle(async () => {
    const { userId, project } = await requireProject(ctx);
    const patch = await parseBody(req, storyboardSchema);
    const updated = await updateProject(project.id, userId, {
      storyboard: {
        ...project.storyboard,
        notes: patch.notes ?? project.storyboard.notes,
        strokes: patch.strokes ?? project.storyboard.strokes,
      },
    });
    if (!updated) return notFound("Project not found.");
    return NextResponse.json(toClientProject(updated));
  });
}
