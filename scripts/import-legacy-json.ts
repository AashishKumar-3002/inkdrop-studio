/**
 * One-off migration: import prototype projects from `data/projects/*.json`
 * into Postgres, assigning them to a user.
 *
 * The prototype stored each project as a single JSON file with no concept of
 * an owner. This walks those files and recreates each one through the normal
 * repository path, so the result is indistinguishable from a project created
 * in the app.
 *
 *   npm run db:import-legacy -- --email you@example.com
 *   npm run db:import-legacy -- --email you@example.com --dir ./data/projects
 *
 * Safe to re-run: it skips any file whose project name already exists for
 * that user, so a partial run can be resumed without creating duplicates.
 */
import fs from "node:fs";
import path from "node:path";
import { eq } from "drizzle-orm";
import { db } from "../src/lib/db";
import { projects, users } from "../src/lib/db/schema";
import { importProject } from "../src/lib/repo/projects";
import type { Project } from "../src/lib/types";

function arg(name: string): string | undefined {
  const i = process.argv.indexOf(`--${name}`);
  return i >= 0 ? process.argv[i + 1] : undefined;
}

async function main() {
  const email = arg("email");
  const dir = path.resolve(arg("dir") ?? "data/projects");

  if (!email) {
    console.error(
      "Missing --email. Usage: npm run db:import-legacy -- --email you@example.com"
    );
    process.exit(1);
  }
  if (!fs.existsSync(dir)) {
    console.error(`No such directory: ${dir}`);
    process.exit(1);
  }

  const [user] = await db
    .select({ id: users.id })
    .from(users)
    .where(eq(users.email, email.toLowerCase()))
    .limit(1);
  if (!user) {
    console.error(
      `No account found for ${email}. Register in the app first, then re-run this.`
    );
    process.exit(1);
  }

  const existing = await db
    .select({ name: projects.name })
    .from(projects)
    .where(eq(projects.userId, user.id));
  const existingNames = new Set(existing.map((p) => p.name));

  const files = fs.readdirSync(dir).filter((f) => f.endsWith(".json"));
  if (files.length === 0) {
    console.log(`No .json files in ${dir} — nothing to import.`);
    return;
  }

  let imported = 0;
  let skipped = 0;

  for (const file of files) {
    const full = path.join(dir, file);
    let data: Partial<Project>;
    try {
      data = JSON.parse(fs.readFileSync(full, "utf-8")) as Partial<Project>;
    } catch (err) {
      console.warn(`  ✗ ${file}: not valid JSON (${(err as Error).message})`);
      continue;
    }

    const name = (data.name || path.basename(file, ".json")).trim();
    if (existingNames.has(name)) {
      console.log(`  – ${name}: already imported, skipping`);
      skipped++;
      continue;
    }
    if (!data.storyBible) {
      console.warn(`  ✗ ${file}: no storyBible, doesn't look like a project`);
      continue;
    }

    const project = await importProject(user.id, data, name);
    existingNames.add(name);
    imported++;
    console.log(
      `  ✓ ${name} (${project.chapters.length} chapter${
        project.chapters.length === 1 ? "" : "s"
      })`
    );
  }

  console.log(
    `\nDone. Imported ${imported}, skipped ${skipped}, out of ${files.length} file(s).`
  );
  console.log(
    "Note: API keys are never carried across — re-enter them under Settings."
  );
}

main()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error(err);
    process.exit(1);
  });
