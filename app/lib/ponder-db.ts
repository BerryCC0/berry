/**
 * Ponder Direct SQL Client
 *
 * Queries Ponder tables directly from Postgres using the `ponder_live` views
 * schema for zero-downtime indexer redeployments.
 *
 * Usage:
 *   import { ponderSql } from "@/app/lib/ponder-db";
 *   const sql = ponderSql();
 *   const nouns = await sql`SELECT * FROM ponder_live.nouns LIMIT 10`;
 */

import { sql } from "@/app/lib/db";

/**
 * Get the shared postgres-js tagged template.
 * All queries should reference tables with the `ponder_live.` schema prefix.
 * This schema always points to the latest fully-synced Ponder deployment.
 */
export function ponderSql() {
  return sql();
}
