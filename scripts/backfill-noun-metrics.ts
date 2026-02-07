/**
 * Backfill Noun Metrics Script
 * Computes area, color_count, and brightness for all existing nouns in the database.
 * 
 * Prerequisites:
 *   1. Run the schema migration to add the columns:
 *      ALTER TABLE nouns ADD COLUMN IF NOT EXISTS area INTEGER;
 *      ALTER TABLE nouns ADD COLUMN IF NOT EXISTS color_count INTEGER;
 *      ALTER TABLE nouns ADD COLUMN IF NOT EXISTS brightness INTEGER;
 *   2. CREATE INDEX IF NOT EXISTS idx_nouns_area ON nouns(area);
 *      CREATE INDEX IF NOT EXISTS idx_nouns_color_count ON nouns(color_count DESC);
 *      CREATE INDEX IF NOT EXISTS idx_nouns_brightness ON nouns(brightness DESC);
 * 
 * Usage: npx tsx scripts/backfill-noun-metrics.ts
 */

import { neon } from '@neondatabase/serverless';
import { config } from 'dotenv';
import { computeAllNounMetrics } from '../app/lib/nouns/utils/noun-metrics';

// Load .env.local first, then .env
config({ path: '.env.local' });
config({ path: '.env' });

const BATCH_SIZE = 100;

async function main() {
  const databaseUrl = process.env.DATABASE_URL;
  if (!databaseUrl) {
    console.error('DATABASE_URL is not set');
    process.exit(1);
  }

  const sql = neon(databaseUrl);

  // Count nouns that need backfilling (area IS NULL)
  const countResult = await sql`
    SELECT COUNT(*) as count FROM legacy_nouns WHERE area IS NULL
  `;
  const totalToBackfill = parseInt(countResult[0]?.count || '0');

  if (totalToBackfill === 0) {
    console.log('All nouns already have metrics. Nothing to backfill.');
    return;
  }

  console.log(`Backfilling metrics for ${totalToBackfill} nouns...`);

  let processed = 0;
  let errors = 0;

  while (true) {
    // Fetch a batch of nouns missing metrics
    const nouns = await sql`
      SELECT id, background, body, accessory, head, glasses
      FROM legacy_nouns
      WHERE area IS NULL
      ORDER BY id ASC
      LIMIT ${BATCH_SIZE}
    `;

    if (nouns.length === 0) break;

    for (const noun of nouns) {
      try {
        const seed = {
          background: noun.background,
          body: noun.body,
          accessory: noun.accessory,
          head: noun.head,
          glasses: noun.glasses,
        };

        const metrics = computeAllNounMetrics(seed);

        await sql`
          UPDATE legacy_nouns
          SET area = ${metrics.area},
              color_count = ${metrics.color_count},
              brightness = ${metrics.brightness}
          WHERE id = ${noun.id}
        `;

        processed++;
      } catch (error) {
        console.error(`Error processing noun ${noun.id}:`, error);
        errors++;
      }
    }

    console.log(`  Processed ${processed}/${totalToBackfill} (${errors} errors)`);
  }

  console.log(`\nBackfill complete: ${processed} updated, ${errors} errors.`);
}

main().catch((err) => {
  console.error('Backfill failed:', err);
  process.exit(1);
});
