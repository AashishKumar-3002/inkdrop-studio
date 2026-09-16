/**
 * Data half of migration 0001: mints a fractional sortKey for every chapter
 * that lacks one, preserving the order the legacy integer "index" gave them,
 * then finalises the column and drops "index".
 *
 * Idempotent — safe to run twice, and a no-op on a fresh database.
 */
import { Pool } from "pg";
import { generateNKeysBetween } from "fractional-indexing";

const pool = new Pool({ connectionString: process.env.DATABASE_URL });

async function main() {
  const client = await pool.connect();
  try {
    const { rows: cols } = await client.query(
      `select column_name from information_schema.columns
       where table_name = 'chapter' and column_name in ('index', 'sortKey')`
    );
    const names = cols.map((c) => c.column_name);
    if (!names.includes("sortKey")) {
      throw new Error("Run the 0001 migration before this script.");
    }
    if (!names.includes("index")) {
      console.log("Already finalised — nothing to do.");
      return;
    }

    await client.query("begin");
    const { rows: projects } = await client.query(
      `select distinct "projectId" from "chapter" where "sortKey" is null`
    );
    for (const { projectId } of projects) {
      // Order by the legacy index so the author's chapter order survives.
      const { rows } = await client.query(
        `select id from "chapter" where "projectId" = $1 order by "index" asc, id asc`,
        [projectId]
      );
      const keys = generateNKeysBetween(null, null, rows.length);
      for (let i = 0; i < rows.length; i++) {
        await client.query(`update "chapter" set "sortKey" = $1 where id = $2`, [
          keys[i],
          rows[i].id,
        ]);
      }
      console.log(`  ${projectId}: ${rows.length} chapters keyed`);
    }
    await client.query(`alter table "chapter" alter column "sortKey" set not null`);
    await client.query(`alter table "chapter" drop column "index"`);
    await client.query("commit");
    console.log(`Done — ${projects.length} project(s) migrated.`);
  } catch (err) {
    await client.query("rollback").catch(() => {});
    throw err;
  } finally {
    client.release();
    await pool.end();
  }
}

main().catch((err) => {
  console.error(err.message);
  process.exit(1);
});
