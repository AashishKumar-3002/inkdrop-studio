import { AIProvider } from "./types";

/**
 * Produces a short (~100 word) summary of a chapter, used to build the
 * hidden "story so far" rolling summary. Deliberately cheap: no streaming,
 * small max output.
 */
export async function summarizeChapter(
  provider: AIProvider,
  opts: { apiKey: string; model: string; title: string; content: string }
): Promise<string> {
  const { apiKey, model, title, content } = opts;
  const system =
    "You compress novel chapters into short continuity notes for later reference. Be concrete: name characters, what changed, what's now true that wasn't before. No commentary, no meta-text — just the summary, 3-5 sentences.";
  const user = `Chapter "${title}":\n\n${content.slice(0, 12000)}\n\nSummarize this chapter in 3-5 sentences for continuity tracking.`;

  let full = "";
  await provider.generateChapter({
    apiKey,
    model,
    systemPrompt: system,
    userPrompt: user,
    onChunk: (chunk) => {
      full += chunk;
    },
  });
  return full.trim();
}
