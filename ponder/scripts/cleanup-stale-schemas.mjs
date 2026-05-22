#!/usr/bin/env node
/**
 * Drop stale ponder deployment schemas.
 *
 * Ponder's --schema strategy writes each deploy to a fresh schema named after
 * its RAILWAY_DEPLOYMENT_ID (a UUID). The --views-schema "ponder_live" trick
 * keeps the frontend pointing at the last fully-synced deploy. But nothing
 * removes the older deploys' schemas — every deploy stays in the DB until
 * something cleans them up. At 80-300 MB per deploy, the database fills.
 *
 * This script removes everything except:
 *   1. The schema that ponder_live's views currently reference
 *      (the LIVE production data — never drop)
 *   2. The N most recent UUID schemas by oid (default 2 — current in-progress
 *      deploy + a buffer)
 *
 * Usage:
 *   node scripts/cleanup-stale-schemas.mjs                # preview (dry run)
 *   node scripts/cleanup-stale-schemas.mjs --execute      # actually drop
 *   KEEP_RECENT=3 node scripts/cleanup-stale-schemas.mjs  # keep 3 newest
 *
 * Reads connection from DATABASE_URL (Railway internal) or DATABASE_PUBLIC_URL.
 */

import pg from 'pg';

const DATABASE_URL = process.env.DATABASE_URL ?? process.env.DATABASE_PUBLIC_URL;
if (!DATABASE_URL) {
  console.error('ERROR: Set DATABASE_URL or DATABASE_PUBLIC_URL');
  process.exit(1);
}

const EXECUTE = process.argv.includes('--execute');
const KEEP_RECENT = Number(process.env.KEEP_RECENT ?? 2);

const UUID_SCHEMA_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/;

const client = new pg.Client({ connectionString: DATABASE_URL });

function bytesToHuman(n) {
  if (n < 1024) return `${n} B`;
  if (n < 1024 ** 2) return `${(n / 1024).toFixed(1)} KB`;
  if (n < 1024 ** 3) return `${(n / 1024 ** 2).toFixed(1)} MB`;
  return `${(n / 1024 ** 3).toFixed(2)} GB`;
}

async function main() {
  await client.connect();

  // ----------------------------------------------------------------------
  // 1. Find what schema ponder_live's views currently reference.
  // ----------------------------------------------------------------------
  const liveQuery = await client.query(`
    SELECT DISTINCT (regexp_match(view_definition, 'FROM\\s+"?([0-9a-f-]{36})"?\\.'))[1] AS target
    FROM information_schema.views
    WHERE table_schema = 'ponder_live'
  `);
  const liveTargets = liveQuery.rows
    .map((r) => r.target)
    .filter((t) => t && UUID_SCHEMA_REGEX.test(t));

  if (liveTargets.length === 0) {
    console.warn('WARN: ponder_live has no views or no parseable targets. Refusing to proceed.');
    console.warn('      If this is a brand-new DB with no live deploy, run with KEEP_RECENT=0 explicitly.');
    if (!process.env.ALLOW_NO_LIVE) {
      await client.end();
      process.exit(1);
    }
  }
  if (liveTargets.length > 1) {
    console.warn(`WARN: ponder_live points to multiple schemas: ${liveTargets.join(', ')}`);
    console.warn('      Keeping all of them.');
  }

  // ----------------------------------------------------------------------
  // 2. Enumerate UUID schemas with size + oid.
  // ----------------------------------------------------------------------
  const schemasQuery = await client.query(`
    SELECT
      n.nspname AS schema,
      n.oid::bigint AS oid,
      COALESCE(SUM(pg_total_relation_size(c.oid)), 0)::bigint AS bytes
    FROM pg_namespace n
    LEFT JOIN pg_class c ON c.relnamespace = n.oid AND c.relkind = 'r'
    WHERE n.nspname ~ '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$'
    GROUP BY n.nspname, n.oid
    ORDER BY n.oid DESC
  `);

  const allSchemas = schemasQuery.rows.map((r) => ({
    name: r.schema,
    oid: Number(r.oid),
    bytes: Number(r.bytes),
  }));

  if (allSchemas.length === 0) {
    console.log('No UUID schemas found. Nothing to clean up.');
    await client.end();
    return;
  }

  // ----------------------------------------------------------------------
  // 3. Decide which to keep.
  // ----------------------------------------------------------------------
  const keepSet = new Set();
  for (const t of liveTargets) keepSet.add(t);
  for (let i = 0; i < Math.min(KEEP_RECENT, allSchemas.length); i++) {
    keepSet.add(allSchemas[i].name);
  }

  const toKeep = allSchemas.filter((s) => keepSet.has(s.name));
  const toDrop = allSchemas.filter((s) => !keepSet.has(s.name));
  const totalBytes = toDrop.reduce((sum, s) => sum + s.bytes, 0);

  // ----------------------------------------------------------------------
  // 4. Report.
  // ----------------------------------------------------------------------
  console.log(`\nMode: ${EXECUTE ? 'EXECUTE (will drop)' : 'DRY RUN (preview only)'}`);
  console.log(`Keep recent: ${KEEP_RECENT}`);
  console.log(`Live target(s): ${liveTargets.join(', ') || '(none)'}\n`);

  console.log('KEEP:');
  for (const s of toKeep) {
    const reason = liveTargets.includes(s.name) ? 'live' : 'recent';
    console.log(`  ${s.name}  ${bytesToHuman(s.bytes).padStart(10)}  (${reason})`);
  }

  console.log('\nDROP:');
  if (toDrop.length === 0) {
    console.log('  (nothing — all schemas are kept)');
  } else {
    for (const s of toDrop) {
      console.log(`  ${s.name}  ${bytesToHuman(s.bytes).padStart(10)}`);
    }
    console.log(`  ----`);
    console.log(`  Total to free: ${bytesToHuman(totalBytes)}`);
  }

  if (!EXECUTE || toDrop.length === 0) {
    if (!EXECUTE && toDrop.length > 0) {
      console.log('\nRe-run with --execute to actually drop these schemas.');
    }
    await client.end();
    return;
  }

  // ----------------------------------------------------------------------
  // 5. Drop, one at a time so a single failure doesn't abort the rest.
  // ----------------------------------------------------------------------
  console.log('\nDropping…');
  let droppedBytes = 0;
  for (const s of toDrop) {
    try {
      // pg parameter substitution doesn't work for identifiers — quote manually.
      const safeName = s.name.replace(/"/g, '""');
      await client.query(`DROP SCHEMA "${safeName}" CASCADE`);
      droppedBytes += s.bytes;
      console.log(`  dropped ${s.name}  (${bytesToHuman(s.bytes)})`);
    } catch (err) {
      console.error(`  FAILED ${s.name}: ${err.message}`);
    }
  }

  console.log(`\nDone. Freed ${bytesToHuman(droppedBytes)} of ${bytesToHuman(totalBytes)}.`);
  await client.end();
}

main().catch((err) => {
  console.error('Fatal:', err);
  process.exit(1);
});
