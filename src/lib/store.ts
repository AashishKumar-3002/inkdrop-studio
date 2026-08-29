import fs from "fs";
import path from "path";
import { randomUUID } from "crypto";
import {
  Project,
  defaultAISettings,
  defaultBookMeta,
  defaultImageSettings,
  defaultRollingSummary,
  emptyStoryBible,
  emptyStoryboard,
} from "./types";

const DATA_DIR = path.join(process.cwd(), "data", "projects");

function ensureDataDir() {
  if (!fs.existsSync(DATA_DIR)) {
    fs.mkdirSync(DATA_DIR, { recursive: true });
  }
}

function projectPath(id: string) {
  return path.join(DATA_DIR, `${id}.json`);
}

/**
 * Backfills fields added after a project was first created, so older
 * project files on disk keep working without a migration step.
 */
function hydrate(project: Project): Project {
  if (!project.aiSettings) project.aiSettings = defaultAISettings();
  if (!project.imageSettings) project.imageSettings = defaultImageSettings();
  if (!project.book) project.book = defaultBookMeta();
  if (!project.rollingSummary) project.rollingSummary = defaultRollingSummary();
  if (!project.storyboard) project.storyboard = emptyStoryboard();
  for (const chapter of project.chapters ?? []) {
    if (typeof chapter.locked !== "boolean") chapter.locked = false;
    if (!chapter.mode) chapter.mode = "ai";
  }
  return project;
}

export function listProjects(): Project[] {
  ensureDataDir();
  const files = fs.readdirSync(DATA_DIR).filter((f) => f.endsWith(".json"));
  return files
    .map((f) => {
      try {
        const raw = fs.readFileSync(path.join(DATA_DIR, f), "utf-8");
        return hydrate(JSON.parse(raw) as Project);
      } catch {
        return null;
      }
    })
    .filter((p): p is Project => p !== null)
    .sort((a, b) => (a.updatedAt < b.updatedAt ? 1 : -1));
}

export function getProject(id: string): Project | null {
  ensureDataDir();
  const p = projectPath(id);
  if (!fs.existsSync(p)) return null;
  const raw = fs.readFileSync(p, "utf-8");
  return hydrate(JSON.parse(raw) as Project);
}

export function saveProject(project: Project): Project {
  ensureDataDir();
  project.updatedAt = new Date().toISOString();
  fs.writeFileSync(projectPath(project.id), JSON.stringify(project, null, 2));
  return project;
}

export function createProject(name: string): Project {
  ensureDataDir();
  const now = new Date().toISOString();
  const project: Project = {
    id: randomUUID(),
    name: name.trim() || "Untitled Novel",
    createdAt: now,
    updatedAt: now,
    onboardingComplete: false,
    storyBible: emptyStoryBible(),
    chapters: [],
    aiSettings: defaultAISettings(),
    imageSettings: defaultImageSettings(),
    book: defaultBookMeta(),
    rollingSummary: defaultRollingSummary(),
    storyboard: emptyStoryboard(),
  };
  fs.writeFileSync(projectPath(project.id), JSON.stringify(project, null, 2));
  return project;
}

/**
 * Imports a project from an exported .inkdrop.json blob. Always assigns a
 * fresh id so importing never collides with (or overwrites) an existing
 * project.
 */
export function importProject(data: Partial<Project>, nameOverride?: string): Project {
  ensureDataDir();
  const now = new Date().toISOString();
  const project: Project = hydrate({
    ...(data as Project),
    id: randomUUID(),
    name: (nameOverride || data.name || "Imported Novel").trim(),
    createdAt: now,
    updatedAt: now,
    onboardingComplete: Boolean(data.onboardingComplete),
    storyBible: data.storyBible ?? emptyStoryBible(),
    chapters: data.chapters ?? [],
    aiSettings: data.aiSettings ?? defaultAISettings(),
    imageSettings: data.imageSettings ?? defaultImageSettings(),
    book: data.book ?? defaultBookMeta(),
    rollingSummary: data.rollingSummary ?? defaultRollingSummary(),
    storyboard: data.storyboard ?? emptyStoryboard(),
  });
  fs.writeFileSync(projectPath(project.id), JSON.stringify(project, null, 2));
  return project;
}

export function deleteProject(id: string): boolean {
  ensureDataDir();
  const p = projectPath(id);
  if (!fs.existsSync(p)) return false;
  fs.unlinkSync(p);
  return true;
}
