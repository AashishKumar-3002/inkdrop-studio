import { NextRequest, NextResponse } from "next/server";
import { getProject } from "@/lib/store";
import { generateCoverImage } from "@/lib/ai/image/openai";

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const project = getProject(id);
  if (!project) return NextResponse.json({ error: "not found" }, { status: 404 });

  const { prompt } = await req.json().catch(() => ({ prompt: "" }));
  if (!prompt || typeof prompt !== "string" || !prompt.trim()) {
    return NextResponse.json({ error: "No prompt provided." }, { status: 400 });
  }

  const { provider, model, apiKey: storedKey } = project.imageSettings;
  const apiKey = storedKey || process.env.OPENAI_API_KEY;
  if (provider !== "openai") {
    return NextResponse.json({ error: "Unsupported image provider." }, { status: 400 });
  }
  if (!apiKey) {
    return NextResponse.json(
      {
        error:
          "No OpenAI API key configured for cover art. Add one under Settings → Image generation (Claude doesn't generate images).",
      },
      { status: 400 }
    );
  }

  try {
    const imageDataUrl = await generateCoverImage({ apiKey, model, prompt });
    return NextResponse.json({ imageDataUrl });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Image generation failed.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
