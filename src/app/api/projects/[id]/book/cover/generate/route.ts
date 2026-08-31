import { NextRequest, NextResponse } from "next/server";
import { generateCoverImage } from "@/lib/ai/image/openai";
import { decryptSecret } from "@/lib/crypto";
import { coverGenerateSchema } from "@/lib/validation";
import { ApiProblem, handle, parseBody, requireProject } from "@/lib/apiHelpers";

export const runtime = "nodejs";
export const maxDuration = 180;

export async function POST(req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  return handle(async () => {
    const { project } = await requireProject(ctx);
    const { prompt } = await parseBody(req, coverGenerateSchema);

    const { provider, model, apiKey: storedKey } = project.imageSettings;
    if (provider !== "openai") {
      throw new ApiProblem(400, "Unsupported image provider.");
    }
    const apiKey = decryptSecret(storedKey) || process.env.OPENAI_API_KEY;
    if (!apiKey) {
      throw new ApiProblem(
        400,
        "No OpenAI API key configured for cover art. Add one under Settings → Cover art (image generation always goes through OpenAI)."
      );
    }

    try {
      const imageDataUrl = await generateCoverImage({ apiKey, model, prompt });
      return NextResponse.json({ imageDataUrl });
    } catch (err) {
      const message = err instanceof Error ? err.message : "Image generation failed.";
      throw new ApiProblem(502, message);
    }
  });
}
