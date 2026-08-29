import OpenAI from "openai";

/**
 * Generates a cover image via the OpenAI Images API and returns it as a
 * data: URL (so it can be stored inline in the project JSON and dropped
 * straight into an <img> tag or an epub cover).
 */
export async function generateCoverImage(opts: {
  apiKey: string;
  model: string;
  prompt: string;
}): Promise<string> {
  const { apiKey, model, prompt } = opts;
  const client = new OpenAI({ apiKey });

  const isGptImage = model.startsWith("gpt-image");
  const result = await client.images.generate({
    model,
    prompt,
    size: "1024x1536",
    n: 1,
    ...(isGptImage ? {} : { response_format: "b64_json" as const }),
  });

  const b64 = result.data?.[0]?.b64_json;
  if (!b64) throw new Error("Image provider returned no image data.");
  return `data:image/png;base64,${b64}`;
}
