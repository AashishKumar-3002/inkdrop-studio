/**
 * Inkdrop Studio — database schema (Drizzle / PostgreSQL).
 *
 * Design note: chapters live in their own table because they grow
 * unboundedly and need ordering, per-row updates and pagination. The
 * smaller, deeply nested, schema-flexible sub-documents (story bible
 * answers, settings, storyboard, rolling summary) are stored as `jsonb`
 * columns on the project row — they're always read and written as a whole.
 */
import {
  boolean,
  index,
  integer,
  jsonb,
  pgTable,
  primaryKey,
  text,
  timestamp,
  uniqueIndex,
} from "drizzle-orm/pg-core";
import type {
  AISettings,
  BookMeta,
  ImageSettings,
  RollingSummary,
  StoryBible,
  Storyboard,
} from "../types";

/** Matches next-auth's AdapterAccountType, inlined so drizzle-kit's schema
 * loader doesn't have to resolve the next-auth package graph. */
type AdapterAccountType = "oauth" | "oidc" | "email" | "webauthn";

export const users = pgTable("user", {
  id: text("id")
    .primaryKey()
    .$defaultFn(() => crypto.randomUUID()),
  name: text("name"),
  email: text("email").notNull().unique(),
  emailVerified: timestamp("emailVerified", { mode: "date", withTimezone: true }),
  image: text("image"),
  /** bcrypt hash — null for users who only ever sign in through OAuth. */
  passwordHash: text("passwordHash"),
  createdAt: timestamp("createdAt", { withTimezone: true }).notNull().defaultNow(),
});

export const accounts = pgTable(
  "account",
  {
    userId: text("userId")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    type: text("type").$type<AdapterAccountType>().notNull(),
    provider: text("provider").notNull(),
    providerAccountId: text("providerAccountId").notNull(),
    refresh_token: text("refresh_token"),
    access_token: text("access_token"),
    expires_at: integer("expires_at"),
    token_type: text("token_type"),
    scope: text("scope"),
    id_token: text("id_token"),
    session_state: text("session_state"),
  },
  (account) => [
    primaryKey({ columns: [account.provider, account.providerAccountId] }),
    index("account_user_idx").on(account.userId),
  ]
);

export const sessions = pgTable("session", {
  sessionToken: text("sessionToken").primaryKey(),
  userId: text("userId")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  expires: timestamp("expires", { mode: "date", withTimezone: true }).notNull(),
});

export const verificationTokens = pgTable(
  "verificationToken",
  {
    identifier: text("identifier").notNull(),
    token: text("token").notNull(),
    expires: timestamp("expires", { mode: "date", withTimezone: true }).notNull(),
  },
  (vt) => [primaryKey({ columns: [vt.identifier, vt.token] })]
);

export const projects = pgTable(
  "project",
  {
    id: text("id")
      .primaryKey()
      .$defaultFn(() => crypto.randomUUID()),
    userId: text("userId")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    name: text("name").notNull(),
    onboardingComplete: boolean("onboardingComplete").notNull().default(false),
    storyBible: jsonb("storyBible").$type<StoryBible>().notNull(),
    aiSettings: jsonb("aiSettings").$type<AISettings>().notNull(),
    imageSettings: jsonb("imageSettings").$type<ImageSettings>().notNull(),
    book: jsonb("book").$type<BookMeta>().notNull(),
    rollingSummary: jsonb("rollingSummary").$type<RollingSummary>().notNull(),
    storyboard: jsonb("storyboard").$type<Storyboard>().notNull(),
    createdAt: timestamp("createdAt", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updatedAt", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [index("project_user_updated_idx").on(t.userId, t.updatedAt)]
);

export const chapters = pgTable(
  "chapter",
  {
    id: text("id")
      .primaryKey()
      .$defaultFn(() => crypto.randomUUID()),
    projectId: text("projectId")
      .notNull()
      .references(() => projects.id, { onDelete: "cascade" }),
    index: integer("index").notNull(),
    title: text("title").notNull(),
    idea: text("idea").notNull().default(""),
    content: text("content").notNull().default(""),
    summary: text("summary").notNull().default(""),
    /** ChapterStatus: idea | generating | drafted | final */
    status: text("status").notNull().default("idea"),
    wordCount: integer("wordCount").notNull().default(0),
    locked: boolean("locked").notNull().default(false),
    /** "ai" | "manual" — how the author intends to produce this chapter. */
    mode: text("mode").notNull().default("ai"),
    createdAt: timestamp("createdAt", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updatedAt", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    uniqueIndex("chapter_project_index_uq").on(t.projectId, t.index),
    index("chapter_project_idx").on(t.projectId, t.index),
  ]
);
