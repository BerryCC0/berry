/**
 * Backfill ENS Names Script
 * Resolves ENS names for all settlers and winners in the database.
 * 
 * Usage: npx tsx scripts/backfill-ens.ts
 */

import { neon } from '@neondatabase/serverless';
import { config } from 'dotenv';

// Load .env.local first, then .env
config({ path: '.env.local' });
config({ path: '.env' });

const BATCH_SIZE = 10;
const RATE_LIMIT_MS = 120; // ~8 req/sec to avoid hammering the API

async function resolveENS(address: string): Promise<string | null> {
  try {
    const response = await fetch(
      `https://api.ensideas.com/ens/resolve/${encodeURIComponent(address)}`
    );
    if (!response.ok) return null;
    const data = await response.json();
    return data.name || null;
  } catch {
    return null;
  }
}

async function main() {
  const databaseUrl = process.env.DATABASE_URL;
  if (!databaseUrl) {
    console.error('DATABASE_URL is not set');
    process.exit(1);
  }

  const sql = neon(databaseUrl);

  // Count settlers missing ENS
  const settlerCount = await sql`
    SELECT COUNT(*) as count FROM nouns
    WHERE settled_by_address IS NOT NULL
      AND settled_by_address != '0x0000000000000000000000000000000000000000'
      AND settled_by_address != ''
      AND settled_by_ens IS NULL
  `;
  const totalSettlers = parseInt(settlerCount[0]?.count || '0');

  // Count winners missing ENS
  const winnerCount = await sql`
    SELECT COUNT(*) as count FROM nouns
    WHERE winner_address IS NOT NULL
      AND winner_address != '0x0000000000000000000000000000000000000000'
      AND winner_address != ''
      AND winner_ens IS NULL
  `;
  const totalWinners = parseInt(winnerCount[0]?.count || '0');

  console.log(`Found ${totalSettlers} settlers and ${totalWinners} winners missing ENS names.`);

  if (totalSettlers === 0 && totalWinners === 0) {
    console.log('Nothing to backfill!');
    return;
  }

  // ── Settlers ──
  let resolved = 0;
  let noEns = 0;
  let errors = 0;

  if (totalSettlers > 0) {
    console.log(`\nResolving settler ENS names...`);

    // Get unique settler addresses missing ENS
    const settlers = await sql`
      SELECT DISTINCT settled_by_address as address
      FROM nouns
      WHERE settled_by_address IS NOT NULL
        AND settled_by_address != '0x0000000000000000000000000000000000000000'
        AND settled_by_address != ''
        AND settled_by_ens IS NULL
    `;

    console.log(`  ${settlers.length} unique settler addresses to resolve`);

    for (let i = 0; i < settlers.length; i += BATCH_SIZE) {
      const batch = settlers.slice(i, i + BATCH_SIZE);

      for (const row of batch) {
        try {
          const ensName = await resolveENS(row.address);
          if (ensName) {
            await sql`
              UPDATE nouns SET settled_by_ens = ${ensName}
              WHERE LOWER(settled_by_address) = ${row.address.toLowerCase()}
                AND settled_by_ens IS NULL
            `;
            resolved++;
          } else {
            noEns++;
          }
          await new Promise(r => setTimeout(r, RATE_LIMIT_MS));
        } catch (error) {
          console.error(`  Error resolving ${row.address}:`, error);
          errors++;
        }
      }

      console.log(`  Settlers: ${i + batch.length}/${settlers.length} checked (${resolved} resolved, ${noEns} no ENS)`);
    }
  }

  // ── Winners ──
  let winResolved = 0;
  let winNoEns = 0;
  let winErrors = 0;

  if (totalWinners > 0) {
    console.log(`\nResolving winner ENS names...`);

    const winners = await sql`
      SELECT DISTINCT winner_address as address
      FROM nouns
      WHERE winner_address IS NOT NULL
        AND winner_address != '0x0000000000000000000000000000000000000000'
        AND winner_address != ''
        AND winner_ens IS NULL
    `;

    console.log(`  ${winners.length} unique winner addresses to resolve`);

    for (let i = 0; i < winners.length; i += BATCH_SIZE) {
      const batch = winners.slice(i, i + BATCH_SIZE);

      for (const row of batch) {
        try {
          const ensName = await resolveENS(row.address);
          if (ensName) {
            await sql`
              UPDATE nouns SET winner_ens = ${ensName}
              WHERE LOWER(winner_address) = ${row.address.toLowerCase()}
                AND winner_ens IS NULL
            `;
            winResolved++;
          } else {
            winNoEns++;
          }
          await new Promise(r => setTimeout(r, RATE_LIMIT_MS));
        } catch (error) {
          console.error(`  Error resolving ${row.address}:`, error);
          winErrors++;
        }
      }

      console.log(`  Winners: ${i + batch.length}/${winners.length} checked (${winResolved} resolved, ${winNoEns} no ENS)`);
    }
  }

  console.log(`\n── Backfill complete ──`);
  console.log(`  Settlers: ${resolved} resolved, ${noEns} no ENS, ${errors} errors`);
  console.log(`  Winners:  ${winResolved} resolved, ${winNoEns} no ENS, ${winErrors} errors`);
}

main().catch((err) => {
  console.error('Backfill failed:', err);
  process.exit(1);
});
