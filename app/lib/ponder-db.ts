/**
 * Ponder Direct SQL Client
 *
 * Queries Ponder tables directly from the Neon database using the
 * `ponder_live` views schema for zero-downtime redeployments.
 *
 * Usage:
 *   import { ponderSql } from "@/app/lib/ponder-db";
 *   const sql = ponderSql();
 *   const nouns = await sql`SELECT * FROM ponder_live.nouns LIMIT 10`;
 */

import { neon } from "@neondatabase/serverless";

/**
 * Get a Neon SQL tagged template function.
 * Each call creates a new connection (serverless-friendly).
 *
 * All queries should reference tables with the `ponder_live.` schema prefix.
 * This schema always points to the latest fully-synced Ponder deployment.
 */
export function ponderSql() {
  return neon(process.env.DATABASE_URL!);
}
