-- Story bible: one row per section instead of one jsonb blob per project.
--
-- The blob made the entire bible a single sync unit, so two devices editing
-- different sections offline overwrote each other wholesale. Unlike the
-- chapter sortKey backfill, this one is expressible in SQL: jsonb_each
-- fans the object out into its ten sections.

CREATE TABLE IF NOT EXISTS "bible_section" (
  "projectId" text NOT NULL REFERENCES "project"("id") ON DELETE CASCADE,
  "sectionId" text NOT NULL,
  "answers" jsonb NOT NULL DEFAULT '{}'::jsonb,
  "notes" text NOT NULL DEFAULT '',
  "updatedAt" timestamp with time zone NOT NULL DEFAULT now(),
  CONSTRAINT "bible_section_pk" PRIMARY KEY ("projectId","sectionId")
);--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "bible_section_project_idx" ON "bible_section" ("projectId");--> statement-breakpoint

INSERT INTO "bible_section" ("projectId","sectionId","answers","notes")
SELECT p."id",
       s.key,
       COALESCE(s.value -> 'answers', '{}'::jsonb),
       COALESCE(s.value ->> 'notes', '')
FROM "project" p,
     LATERAL jsonb_each(COALESCE(p."storyBible", '{}'::jsonb)) AS s(key, value)
ON CONFLICT ("projectId","sectionId") DO NOTHING;--> statement-breakpoint

ALTER TABLE "project" DROP COLUMN IF EXISTS "storyBible";
