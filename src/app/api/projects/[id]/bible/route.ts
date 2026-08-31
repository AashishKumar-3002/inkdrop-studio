import { NextRequest, NextResponse } from "next/server";
import { toClientProject, updateProject } from "@/lib/repo/projects";
import { bibleUpdateSchema } from "@/lib/validation";
import { handle, notFound, parseBody, requireProject } from "@/lib/apiHelpers";

export const runtime = "nodejs";

export async function PUT(req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  return handle(async () => {
    const { userId, project } = await requireProject(ctx);
    const body = await parseBody(req, bibleUpdateSchema);
    const updated = await updateProject(project.id, userId, {
      storyBible: body.storyBible ?? project.storyBible,
      ...(typeof body.onboardingComplete === "boolean"
        ? { onboardingComplete: body.onboardingComplete }
        : {}),
    });
    if (!updated) return notFound("Project not found.");
    return NextResponse.json(toClientProject(updated));
  });
}
