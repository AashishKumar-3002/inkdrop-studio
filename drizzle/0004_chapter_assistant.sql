CREATE TABLE "chapter_assistant_entry" (
  "id" text PRIMARY KEY NOT NULL,
  "chapterId" text NOT NULL REFERENCES "chapter"("id") ON DELETE CASCADE,
  "kind" text NOT NULL,
  "sourceContent" text NOT NULL,
  "payload" jsonb NOT NULL,
  "createdAt" timestamp with time zone NOT NULL,
  "deletedAt" timestamp with time zone
);
--> statement-breakpoint
CREATE INDEX "chapter_assistant_history_idx" ON "chapter_assistant_entry" ("chapterId", "createdAt");
