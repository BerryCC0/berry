/**
 * Shared postgres-js client.
 *
 * Singleton per Node process (Vercel function instance keeps one pool).
 * - `prepare: false` for PgBouncer transaction-mode compatibility.
 * - bigint returned as string (matches the prior @neondatabase/serverless
 *   behavior; avoids BigInt JSON serialization issues on Ponder rows).
 */

import postgres from "postgres";

let cached: postgres.Sql | null = null;

export function sql(): postgres.Sql {
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

/**
 * Wrap a value so postgres-js sends it as JSON into a jsonb column.
 *
 * Necessary because `${JSON.stringify(obj)}` on a jsonb column stores the
 * value as a JSON *string scalar* (not a parsed object). Passing through
 * `sql.json()` is the correct route, but its TS signature only accepts
 * `JSONValue`, which excludes our domain types (Theme, SystemSettings, etc.)
 * even though they serialize fine at runtime. This helper widens the type.
 */
export function asJson(value: unknown) {
  return sql().json(value as never);
}
