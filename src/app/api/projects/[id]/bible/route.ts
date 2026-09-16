import { NextRequest, NextResponse } from "next/server";
import { saveBible, toClientProject, updateProject } from "@/lib/repo/projects";
import { bibleUpdateSchema } from "@/lib/validation";
import { handle, notFound, parseBody, requireProject } from "@/lib/apiHelpers";

export const runtime = "nodejs";

export async function PUT(req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  return handle(async () => {
    const { userId, project } = await requireProject(ctx);
    const body = await parseBody(req, bibleUpdateSchema);
    // Sections go through saveBible so only the ones that actually changed
    // are written; onboardingComplete still lives on the project row.
    let updated = body.storyBible
      ? await saveBible(project.id, userId, body.storyBible)
      : project;
    if (updated && typeof body.onboardingComplete === "boolean") {
      updated = await updateProject(project.id, userId, {
        onboardingComplete: body.onboardingComplete,
      });
    }
    if (!updated) return notFound("Project not found.");
    return NextResponse.json(toClientProject(updated));
  });
}
