import { drizzle } from "drizzle-orm/node-postgres";
import { Pool } from "pg";
import * as schema from "./schema";

function createPool(): Pool {
  const connectionString = process.env.DATABASE_URL;
  if (!connectionString) {
    throw new Error(
      "DATABASE_URL is not set. Copy .env.example to .env.local and point it at your Postgres instance."
    );
  }
  return new Pool({
    connectionString,
    // Managed Postgres (Neon, Supabase, RDS…) terminates TLS with certs that
    // aren't in the container's trust store; opt in explicitly via env.
    ssl: process.env.DATABASE_SSL === "true" ? { rejectUnauthorized: false } : undefined,
    max: Number(process.env.DATABASE_POOL_MAX ?? 10),
  });
}

/**
 * A single pool per process. Next.js dev-mode hot reloading re-evaluates
 * modules on every change, so without this the process leaks a pool (and
 * eventually Postgres connections) per edit.
 */
const globalForDb = globalThis as unknown as { __inkdropPool?: Pool };

/**
 * Built on first use rather than at import time, so simply importing a
 * module that touches the database doesn't crash the process when
 * DATABASE_URL is absent (unit tests, `next build`'s static analysis).
 */
export function getPool(): Pool {
  if (!globalForDb.__inkdropPool) globalForDb.__inkdropPool = createPool();
  return globalForDb.__inkdropPool;
}

// The proxy defers connecting until a query is actually issued.
export const db = drizzle(
  new Proxy({} as Pool, {
    get(_target, prop, receiver) {
      return Reflect.get(getPool(), prop, receiver);
    },
  }),
  { schema }
);

export { schema };
