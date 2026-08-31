import { NextRequest, NextResponse } from "next/server";
import { toClientProject, updateProject } from "@/lib/repo/projects";
import { mergeImageSettings } from "@/lib/settings";
import { imageSettingsSchema } from "@/lib/validation";
import { handle, notFound, parseBody, requireProject } from "@/lib/apiHelpers";

export const runtime = "nodejs";

export async function PUT(req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  return handle(async () => {
    const { userId, project } = await requireProject(ctx);
    const patch = await parseBody(req, imageSettingsSchema);
    const updated = await updateProject(project.id, userId, {
      imageSettings: mergeImageSettings(project.imageSettings, patch),
    });
    if (!updated) return notFound("Project not found.");
    return NextResponse.json(toClientProject(updated));
  });
}
