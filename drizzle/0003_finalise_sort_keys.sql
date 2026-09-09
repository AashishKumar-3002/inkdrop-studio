-- Finalises what 0001 left half-done, so a fresh install and a migrated one
-- end up with the same schema.
--
-- 0001 had to leave "sortKey" nullable and keep the legacy "index" column,
-- because filling the keys needs application code (see
-- scripts/backfill-sort-keys.mjs). On a database that ran the backfill both
-- statements are no-ops; on a fresh one there are no rows so both apply
-- cleanly. On a database with rows that skipped the backfill, SET NOT NULL
-- fails loudly — which is the correct outcome, not a bug.

ALTER TABLE "chapter" ALTER COLUMN "sortKey" SET NOT NULL;--> statement-breakpoint
ALTER TABLE "chapter" DROP COLUMN IF EXISTS "index";
