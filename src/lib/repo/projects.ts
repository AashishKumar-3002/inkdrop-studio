/**
 * Project repository — the only place that talks to the database about
 * projects and chapters.
 *
 * Every read and write is scoped by `userId`. There is deliberately no
 * "get project by id" that skips the owner check: a missing project and
 * someone else's project both return null, so the API can answer 404 for
 * both and never leak that an id exists.
 */
import { and, asc, eq, sql } from "drizzle-orm";
import { db } from "@/lib/db";
import { chapters, projects } from "@/lib/db/schema";
import {
  AISettings,
  Chapter,
  ClientProject,
  ImageSettings,
  Project,
  defaultAISettings,
  defaultBookMeta,
  defaultImageSettings,
  defaultRollingSummary,
  emptyStoryBible,
  emptyStoryboard,
} from "@/lib/types";
import { hasSecret } from "@/lib/crypto";

type ProjectRow = typeof projects.$inferSelect;
type ChapterRow = typeof chapters.$inferSelect;

function toChapter(row: ChapterRow): Chapter {
  return {
    id: row.id,
    index: row.index,
    title: row.title,
    idea: row.idea,
    content: row.content,
    summary: row.summary,
    status: row.status as Chapter["status"],
    wordCount: row.wordCount,
    locked: row.locked,
    mode: row.mode === "manual" ? "manual" : "ai",
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
  };
}

function toProject(row: ProjectRow, chapterRows: ChapterRow[]): Project {
  return {
    id: row.id,
    userId: row.userId,
    name: row.name,
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
    onboardingComplete: row.onboardingComplete,
    storyBible: row.storyBible ?? emptyStoryBible(),
    chapters: chapterRows.map(toChapter),
    aiSettings: { ...defaultAISettings(), ...(row.aiSettings ?? {}) },
    imageSettings: { ...defaultImageSettings(), ...(row.imageSettings ?? {}) },
    book: { ...defaultBookMeta(), ...(row.book ?? {}) },
    rollingSummary: { ...defaultRollingSummary(), ...(row.rollingSummary ?? {}) },
    storyboard: { ...emptyStoryboard(), ...(row.storyboard ?? {}) },
  };
}

/** Strips secrets so a project can safely be serialized to the browser. */
export function toClientProject(project: Project): ClientProject {
  // `apiKey`/`apiKeyProvider` are pulled off defensively too: they are
  // transport-only inputs, but a document written by an older build could
  // still carry them, and this is the last gate before the wire.
  const {
    apiKeys,
    ...aiRest
  } = project.aiSettings as AISettings & { apiKey?: string; apiKeyProvider?: string };
  delete (aiRest as { apiKey?: string }).apiKey;
  delete (aiRest as { apiKeyProvider?: string }).apiKeyProvider;

  const { apiKey, ...imageRest } = project.imageSettings;
  const configuredKeys: Partial<Record<keyof typeof apiKeys, boolean>> = {};
  for (const [providerId, value] of Object.entries(apiKeys ?? {})) {
    if (hasSecret(value)) {
      configuredKeys[providerId as keyof typeof apiKeys] = true;
    }
  }
  return {
    ...project,
    aiSettings: { ...aiRest, configuredKeys },
    imageSettings: { ...imageRest, hasApiKey: hasSecret(apiKey) },
  };
}

function wordCount(text: string): number {
  return text.trim() ? text.trim().split(/\s+/).length : 0;
}

/* ------------------------------------------------------------------ */
/* Reads                                                               */
/* ------------------------------------------------------------------ */

/** Project summaries for the dashboard — no chapter bodies loaded. */
export async function listProjects(userId: string) {
  const rows = await db
    .select({
      id: projects.id,
      name: projects.name,
      createdAt: projects.createdAt,
      updatedAt: projects.updatedAt,
      onboardingComplete: projects.onboardingComplete,
      book: projects.book,
      chapterCount: sql<number>`(
        select count(*)::int from ${chapters} where ${chapters.projectId} = ${projects.id}
      )`,
      wordCount: sql<number>`(
        select coalesce(sum(${chapters.wordCount}), 0)::int
        from ${chapters} where ${chapters.projectId} = ${projects.id}
      )`,
    })
    .from(projects)
    .where(eq(projects.userId, userId))
    .orderBy(sql`${projects.updatedAt} desc`);

  return rows.map((r) => ({
    ...r,
    createdAt: r.createdAt.toISOString(),
    updatedAt: r.updatedAt.toISOString(),
  }));
}

export async function getProject(id: string, userId: string): Promise<Project | null> {
  const [row] = await db
    .select()
    .from(projects)
    .where(and(eq(projects.id, id), eq(projects.userId, userId)))
    .limit(1);
  if (!row) return null;
  const chapterRows = await db
    .select()
    .from(chapters)
    .where(eq(chapters.projectId, id))
    .orderBy(asc(chapters.index));
  return toProject(row, chapterRows);
}

/** Loads a project without its chapter bodies — for settings-only writes. */
export async function getProjectMeta(id: string, userId: string): Promise<Project | null> {
  const [row] = await db
    .select()
    .from(projects)
    .where(and(eq(projects.id, id), eq(projects.userId, userId)))
    .limit(1);
  return row ? toProject(row, []) : null;
}

export async function getChapter(
  projectId: string,
  chapterId: string,
  userId: string
): Promise<{ project: Project; chapter: Chapter } | null> {
  const project = await getProjectMeta(projectId, userId);
  if (!project) return null;
  const [row] = await db
    .select()
    .from(chapters)
    .where(and(eq(chapters.id, chapterId), eq(chapters.projectId, projectId)))
    .limit(1);
  if (!row) return null;
  return { project, chapter: toChapter(row) };
}

/* ------------------------------------------------------------------ */
/* Project writes                                                      */
/* ------------------------------------------------------------------ */

type ProjectDocPatch = Partial<
  Pick<
    Project,
    | "name"
    | "onboardingComplete"
    | "storyBible"
    | "aiSettings"
    | "imageSettings"
    | "book"
    | "rollingSummary"
    | "storyboard"
  >
>;

/**
 * Patches the project row. Only the fields present in `patch` are written,
 * so two concurrent writes to different parts of a project don't clobber
 * each other the way a whole-document save would.
 */
export async function updateProject(
  id: string,
  userId: string,
  patch: ProjectDocPatch
): Promise<Project | null> {
  const [row] = await db
    .update(projects)
    .set({ ...patch, updatedAt: new Date() })
    .where(and(eq(projects.id, id), eq(projects.userId, userId)))
    .returning();
  return row ? toProject(row, []) : null;
}

/** Bumps updatedAt so the dashboard's "recently worked on" order is right. */
export async function touchProject(id: string, userId: string): Promise<void> {
  await db
    .update(projects)
    .set({ updatedAt: new Date() })
    .where(and(eq(projects.id, id), eq(projects.userId, userId)));
}

export async function createProject(userId: string, name: string): Promise<Project> {
  const [row] = await db
    .insert(projects)
    .values({
      userId,
      name: name.trim() || "Untitled Novel",
      onboardingComplete: false,
      storyBible: emptyStoryBible(),
      aiSettings: defaultAISettings(),
      imageSettings: defaultImageSettings(),
      book: defaultBookMeta(),
      rollingSummary: defaultRollingSummary(),
      storyboard: emptyStoryboard(),
    })
    .returning();
  return toProject(row, []);
}

export async function deleteProject(id: string, userId: string): Promise<boolean> {
  const deleted = await db
    .delete(projects)
    .where(and(eq(projects.id, id), eq(projects.userId, userId)))
    .returning({ id: projects.id });
  return deleted.length > 0;
}

/**
 * Imports a `.inkdrop.json` export as a brand-new project owned by the
 * importer. API keys in the file are discarded rather than trusted — an
 * export shared between people must never carry credentials across.
 */
export async function importProject(
  userId: string,
  data: Partial<Project>,
  nameOverride?: string
): Promise<Project> {
  const aiSettings: AISettings = {
    ...defaultAISettings(),
    ...(data.aiSettings ?? {}),
    apiKeys: {},
  };
  const imageSettings: ImageSettings = {
    ...defaultImageSettings(),
    ...(data.imageSettings ?? {}),
    apiKey: "",
  };

  return db.transaction(async (tx) => {
    const [row] = await tx
      .insert(projects)
      .values({
        userId,
        name: (nameOverride || data.name || "Imported Novel").trim(),
        onboardingComplete: Boolean(data.onboardingComplete),
        storyBible: data.storyBible ?? emptyStoryBible(),
        aiSettings,
        imageSettings,
        book: { ...defaultBookMeta(), ...(data.book ?? {}) },
        rollingSummary: { ...defaultRollingSummary(), ...(data.rollingSummary ?? {}) },
        storyboard: { ...emptyStoryboard(), ...(data.storyboard ?? {}) },
      })
      .returning();

    const incoming = (data.chapters ?? []).slice().sort((a, b) => a.index - b.index);
    if (incoming.length > 0) {
      await tx.insert(chapters).values(
        incoming.map((c, i) => ({
          projectId: row.id,
          // Renumber densely from 1 — an export with gaps or duplicate
          // indexes would otherwise violate the unique constraint.
          index: i + 1,
          title: c.title || `Chapter ${i + 1}`,
          idea: c.idea ?? "",
          content: c.content ?? "",
          summary: c.summary ?? "",
          status: c.status ?? (c.content ? "drafted" : "idea"),
          wordCount: wordCount(c.content ?? ""),
          locked: Boolean(c.locked),
          mode: c.mode === "manual" ? "manual" : "ai",
        }))
      );
    }

    const chapterRows = await tx
      .select()
      .from(chapters)
      .where(eq(chapters.projectId, row.id))
      .orderBy(asc(chapters.index));
    return toProject(row, chapterRows);
  });
}

/* ------------------------------------------------------------------ */
/* Chapter writes                                                      */
/* ------------------------------------------------------------------ */

export async function createChapter(
  projectId: string,
  input: {
    title?: string;
    idea?: string;
    content?: string;
    status?: Chapter["status"];
    mode?: Chapter["mode"];
  }
): Promise<Chapter> {
  const content = input.content ?? "";
  return db.transaction(async (tx) => {
    // max(index) + 1 inside the transaction, so two chapters created at the
    // same moment can't both claim the same index.
    const [{ next }] = await tx
      .select({ next: sql<number>`coalesce(max(${chapters.index}), 0) + 1` })
      .from(chapters)
      .where(eq(chapters.projectId, projectId));

    const [row] = await tx
      .insert(chapters)
      .values({
        projectId,
        index: next,
        title: input.title?.trim() || `Chapter ${next}`,
        idea: input.idea ?? "",
        content,
        status: input.status ?? (content ? "drafted" : "idea"),
        wordCount: wordCount(content),
        mode: input.mode === "manual" ? "manual" : "ai",
      })
      .returning();

    await tx
      .update(projects)
      .set({ updatedAt: new Date() })
      .where(eq(projects.id, projectId));
    return toChapter(row);
  });
}

export async function updateChapter(
  projectId: string,
  chapterId: string,
  patch: Partial<
    Pick<
      Chapter,
      "title" | "idea" | "content" | "summary" | "status" | "locked" | "mode"
    >
  >
): Promise<Chapter | null> {
  const values: Record<string, unknown> = { ...patch, updatedAt: new Date() };
  if (typeof patch.content === "string") values.wordCount = wordCount(patch.content);

  const [row] = await db
    .update(chapters)
    .set(values)
    .where(and(eq(chapters.id, chapterId), eq(chapters.projectId, projectId)))
    .returning();
  if (!row) return null;
  await db
    .update(projects)
    .set({ updatedAt: new Date() })
    .where(eq(projects.id, projectId));
  return toChapter(row);
}

/**
 * Deletes a chapter and closes the gap in the numbering. The renumber walks
 * upward in index order so each chapter moves into a slot that was freed a
 * moment earlier — the unique (projectId, index) constraint holds at every
 * step.
 */
export async function deleteChapter(
  projectId: string,
  chapterId: string
): Promise<boolean> {
  return db.transaction(async (tx) => {
    const deleted = await tx
      .delete(chapters)
      .where(and(eq(chapters.id, chapterId), eq(chapters.projectId, projectId)))
      .returning({ index: chapters.index });
    if (deleted.length === 0) return false;

    const rest = await tx
      .select({ id: chapters.id, index: chapters.index })
      .from(chapters)
      .where(eq(chapters.projectId, projectId))
      .orderBy(asc(chapters.index));

    for (let i = 0; i < rest.length; i++) {
      const wanted = i + 1;
      if (rest[i].index !== wanted) {
        await tx
          .update(chapters)
          .set({ index: wanted })
          .where(eq(chapters.id, rest[i].id));
      }
    }

    await tx
      .update(projects)
      .set({ updatedAt: new Date() })
      .where(eq(projects.id, projectId));
    return true;
  });
}

/** Bulk chapter upload — appended in order, in one transaction. */
export async function createChapters(
  projectId: string,
  items: { title: string; content: string; status: Chapter["status"] }[]
): Promise<Chapter[]> {
  if (items.length === 0) return [];
  return db.transaction(async (tx) => {
    const [{ next }] = await tx
      .select({ next: sql<number>`coalesce(max(${chapters.index}), 0) + 1` })
      .from(chapters)
      .where(eq(chapters.projectId, projectId));

    const rows = await tx
      .insert(chapters)
      .values(
        items.map((item, i) => ({
          projectId,
          index: next + i,
          title: item.title?.trim() || `Chapter ${next + i}`,
          content: item.content,
          status: item.status,
          wordCount: wordCount(item.content),
          mode: "manual" as const,
        }))
      )
      .returning();

    await tx
      .update(projects)
      .set({ updatedAt: new Date() })
      .where(eq(projects.id, projectId));
    return rows.map(toChapter);
  });
}

/* ------------------------------------------------------------------ */
/* Settings helpers                                                    */
/* ------------------------------------------------------------------ */

// Pure logic, defined in lib/settings.ts so it's testable without a database.
export { mergeAISettings, mergeImageSettings } from "@/lib/settings";
