import { NextRequest, NextResponse } from "next/server";
import { toClientProject, updateProject } from "@/lib/repo/projects";
import { mergeAISettings } from "@/lib/settings";
import { aiSettingsSchema } from "@/lib/validation";
import { handle, notFound, parseBody, requireProject } from "@/lib/apiHelpers";

export const runtime = "nodejs";

export async function PUT(req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  return handle(async () => {
    const { userId, project } = await requireProject(ctx);
    const patch = await parseBody(req, aiSettingsSchema);
    const updated = await updateProject(project.id, userId, {
      aiSettings: mergeAISettings(project.aiSettings, patch),
    });
    if (!updated) return notFound("Project not found.");
    return NextResponse.json(toClientProject(updated));
  });
}
