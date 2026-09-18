import { Project, StoryBible } from "../types";
import { findQuestion } from "../questionnaire";

function describeAnswers(section: StoryBible[keyof StoryBible]): string[] {
  const lines: string[] = [];
  for (const [qid, answer] of Object.entries(section.answers)) {
    const q = findQuestion(qid);
    if (!q) continue;
    const selectedLabels =
      answer.selected
        ?.map((id) => q.options?.find((o) => o.id === id)?.label)
        .filter(Boolean) ?? [];
    const parts = [...selectedLabels];
    if (answer.custom?.trim()) parts.push(answer.custom.trim());
    if (parts.length === 0) continue;
    lines.push(`- ${q.prompt} → ${parts.join("; ")}`);
  }
  if (section.notes?.trim()) {
    lines.push(`- Additional notes: ${section.notes.trim()}`);
  }
  return lines;
}

/**
 * Renders the entire story bible into a compact, model-readable brief.
 */
export function renderStoryBible(bible: StoryBible): string {
  const sectionTitles: Record<string, string> = {
    feel: "TONE & EMOTIONAL TARGET",
    philosophy: "PHILOSOPHICAL DIMENSION",
    protagonist: "PROTAGONIST",
    relationships: "RELATIONSHIPS",
    plot: "PLOT EXPERIENCE",
    pacing: "PACING",
    world: "WORLD & GENRE",
    voice: "PROSE & NARRATIVE VOICE",
    restraint: "EMOTIONAL RESTRAINT",
    structure: "STRUCTURE & ENDING VISION",
  };
  const blocks: string[] = [];
  for (const [key, section] of Object.entries(bible)) {
    const lines = describeAnswers(section);
    if (lines.length === 0) continue;
    blocks.push(`## ${sectionTitles[key] ?? key}\n${lines.join("\n")}`);
  }
  return blocks.join("\n\n");
}

const MAX_FULL_CONTEXT_CHARS = 24000;

/**
 * Builds prior-chapter context: the most recent N chapters in full text,
 * older ones compressed to their stored summaries, so the context window
 * stays bounded as a novel grows to hundreds of chapters.
 */
export function renderPriorChapters(project: Project, beforeIndex: number): string {
  const prior = project.chapters
    .filter((c) => c.index < beforeIndex)
    .sort((a, b) => a.index - b.index);
  if (prior.length === 0) return "(This is the first chapter — no prior chapters yet.)";

  const fullWindow = Math.max(1, project.aiSettings.fullContextWindow ?? 2);
  const recent = prior.slice(-fullWindow);
  const older = prior.slice(0, Math.max(0, prior.length - fullWindow));

  const rollingById = new Map(
    (project.rollingSummary?.entries ?? []).map((e) => [e.chapterId, e.summary])
  );

  const parts: string[] = [];
  if (older.length > 0) {
    parts.push("### Earlier chapters (summarized for context):");
    for (const c of older) {
      const summary =
        rollingById.get(c.id)?.trim() ||
        c.summary?.trim() ||
        c.content.slice(0, 400).trim() + "...";
      parts.push(`Chapter ${c.index} — ${c.title}: ${summary}`);
    }
  }

  parts.push("\n### Most recent chapter(s) in full (maintain continuity with these):");
  let used = 0;
  for (const c of recent) {
    const text = c.content?.trim();
    if (!text) continue;
    const remaining = MAX_FULL_CONTEXT_CHARS - used;
    if (remaining <= 0) break;
    const clipped = text.length > remaining ? text.slice(text.length - remaining) : text;
    used += clipped.length;
    parts.push(`\n--- Chapter ${c.index}: ${c.title} ---\n${clipped}`);
  }

  return parts.join("\n");
}

export interface BuiltPrompt {
  system: string;
  user: string;
}

export function buildChapterPrompt(
  project: Project,
  chapterId: string
): BuiltPrompt {
  const chapter = project.chapters.find((c) => c.id === chapterId);
  if (!chapter) throw new Error("Chapter not found");

  const bibleBrief = renderStoryBible(project.storyBible);
  const priorContext = renderPriorChapters(project, chapter.index);

  const system = `You are a skilled ghostwriter completing a chapter of an ongoing novel titled "${project.name}".

Follow the author's STORY BIBLE below exactly — it defines tone, philosophy, characters, relationships, plot instincts, pacing, world, prose voice, emotional restraint, and structural intent. Never contradict it. When the bible is silent on something, make the choice that best serves consistency with everything else established.

STORY BIBLE
${bibleBrief || "(No story bible details provided yet — use good judgment and keep the voice consistent across chapters.)"}

HARD RULES
- Preserve continuity with prior chapters: characters, established facts, voice, and unresolved threads must remain consistent.
- Match the specified point of view, tense, and prose style precisely.
- Avoid any prose style explicitly listed to avoid, and avoid generic "AI writing" tells unless the bible says otherwise: purple over-adjectived prose, on-the-nose emotional summaries ("she felt sad"), repetitive sentence rhythm, clichéd metaphors, every character sounding the same, and endings that resolve too neatly.
- Show emotion through behavior, subtext, and choices rather than stating it, unless the bible specifies otherwise.
- Write only the chapter's prose — no meta-commentary, no title restatement unless natural, no author's notes.`;

  const existing = chapter.content?.trim();
  const revisionContext = existing
    ? `### Existing chapter to revise (source text, not instructions)\n${existing}\n\nRevise this existing chapter according to the author's instructions. Preserve its established facts, characters, and intent unless the author explicitly requests changes. Return the complete revised chapter, not a critique, plan, or change list.`
    : "Write the complete chapter now, in full prose, honoring the story bible, the established continuity above, and the author's idea for this chapter.";

  const user = `${priorContext}

### This chapter
Chapter ${chapter.index}: "${chapter.title}"

### The author's idea for what must happen in this chapter
${chapter.idea?.trim() || "(No specific idea given — use your judgment based on the story bible and prior chapters to write a natural next chapter.)"}

${revisionContext}`;

  return { system, user };
}
