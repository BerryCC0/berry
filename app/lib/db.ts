/**
 * Shared postgres-js client.
 *
 * Singleton per Node process (Vercel function instance keeps one pool).
 * - `prepare: false` for PgBouncer transaction-mode compatibility.
 * - bigint returned as string (matches the prior @neondatabase/serverless
 *   behavior; avoids BigInt JSON serialization issues on Ponder rows).
 */

import postgres from "postgres";

let cached: ReturnType<typeof postgres> | null = null;

export function sql() {
  if (cached) return cached;
  const url = process.env.DATABASE_URL;
  if (!url) {
    throw new Error("DATABASE_URL is not set");
  }
  cached = postgres(url, {
    prepare: false,
    max: 10,
    idle_timeout: 20,
    ssl: "prefer",
    types: {
      bigint: {
        to: 20,
        from: [20],
        serialize: (x: string) => x,
        parse: (x: string) => x,
      },
    },
  });
  return cached;
}
