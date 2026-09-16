/**
 * Brings a desktop install's local database up to date, then exits.
 *
 * Run by the Electron shell before the server starts rather than lazily on
 * first query: a half-migrated schema being read by a live server is how you
 * get errors that only reproduce on someone else's machine, and doing it up
 * front means a failure can be shown as "couldn't open your library" instead
 * of a 500 three clicks later.
 *
 * Usage: node migrate-local.mjs <dataDir> <migrationsFolder>
 */
import { drizzle } from "drizzle-orm/pglite";
import { migrate } from "drizzle-orm/pglite/migrator";
import { PGlite } from "@electric-sql/pglite";

const [dataDir, migrationsFolder] = process.argv.slice(2);

if (!dataDir || !migrationsFolder) {
  console.error("usage: migrate-local.mjs <dataDir> <migrationsFolder>");
  process.exit(2);
}

const client = new PGlite(dataDir);
const db = drizzle(client);

try {
  await migrate(db, { migrationsFolder });
  console.log("[migrate] local database is up to date");
} catch (err) {
  console.error(`[migrate] failed: ${err?.message ?? err}`);
  process.exitCode = 1;
} finally {
  await client.close();
}
