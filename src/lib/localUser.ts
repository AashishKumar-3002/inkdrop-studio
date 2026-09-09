import { eq } from "drizzle-orm";
import { db, isLocalDb } from "@/lib/db";
import { users } from "@/lib/db/schema";

/**
 * Single-user mode.
 *
 * On a desktop install the database lives in the user's own data folder and
 * nobody else can reach it, so making them invent a password to unlock it is
 * theatre — it protects nothing and costs a signup screen before they can
 * write a word.
 *
 * The row still exists, and every query in the repo layer is still scoped by
 * userId. That is deliberate: the same code serves the hosted build, and when
 * someone upgrades to credits or a subscription their local projects already
 * have an owner to attach to an account rather than needing a migration.
 */
const LOCAL_USER_ID = "local-user";
const LOCAL_USER_EMAIL = "you@localhost";

/** Resolved once per process; the row is created on first use. */
let ensured: Promise<string> | null = null;

export function isSingleUserMode(): boolean {
  // Tied to the embedded database rather than to the desktop flag: a desktop
  // build pointed at a shared Postgres has other people's work in it and
  // must still authenticate.
  return isLocalDb();
}

export function localUserId(): Promise<string> {
  if (!ensured) {
    ensured = (async () => {
      const existing = await db
        .select({ id: users.id })
        .from(users)
        .where(eq(users.id, LOCAL_USER_ID))
        .limit(1);
      if (existing.length === 0) {
        await db
          .insert(users)
          .values({
            id: LOCAL_USER_ID,
            email: LOCAL_USER_EMAIL,
            name: "You",
          })
          // Two requests can race on a cold start; whichever loses is fine.
          .onConflictDoNothing();
      }
      return LOCAL_USER_ID;
    })().catch((err) => {
      // Don't cache a failure — a transient error on first boot would
      // otherwise wedge the process into permanently having no user.
      ensured = null;
      throw err;
    });
  }
  return ensured;
}
