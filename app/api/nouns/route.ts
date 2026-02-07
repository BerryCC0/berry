/**
 * Nouns List API Route
 * GET /api/nouns - List all cached Nouns
 * POST /api/nouns - Batch fetch multiple Nouns by IDs
 *
 * Queries Ponder's ponder_live schema for zero-downtime deployments
 */

import { NextRequest, NextResponse } from 'next/server';
import { ponderSql } from '@/app/lib/ponder-db';

/**
 * POST - Batch fetch multiple Nouns by IDs
 * Body: { ids: string[] }
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const ids: string[] = body.ids;

    if (!Array.isArray(ids) || ids.length === 0) {
      return NextResponse.json({ nouns: {} });
    }

    // Limit to 100 IDs per request
    const limitedIds = ids.slice(0, 100).map(id => parseInt(id)).filter(id => !isNaN(id));

    if (limitedIds.length === 0) {
      return NextResponse.json({ nouns: {} });
    }

    const sql = ponderSql();

    const nouns = await sql`
      SELECT id, background, body, accessory, head, glasses,
             settled_by_address, settled_by_ens, settled_at,
             winning_bid, winner_address, winner_ens,
             owner, svg, area, color_count, brightness, burned
      FROM ponder_live.nouns
      WHERE id = ANY(${limitedIds})
    `;

    // Return as a map keyed by ID for easy lookup
    const nounsMap: Record<string, typeof nouns[0]> = {};
    for (const noun of nouns) {
      nounsMap[noun.id.toString()] = noun;
    }

    return NextResponse.json({ nouns: nounsMap });
  } catch (error) {
    console.error('[API] Failed to batch fetch nouns:', error);
    return NextResponse.json(
      { error: 'Failed to fetch nouns' },
      { status: 500 }
    );
  }
}

/**
 * Valid sort options
 */
const VALID_SORTS = [
  'newest', 'oldest',
  'smallest', 'largest',
  'most_colorful', 'least_colorful',
  'brightest', 'darkest',
] as const;
type SortOption = typeof VALID_SORTS[number];

/**
 * GET - List cached Nouns with optional filters
 *
 * Query params:
 *   limit, offset - Pagination (max 100)
 *   settler       - Filter by settler address
 *   winner        - Filter by auction winner address
 *   background, body, accessory, head, glasses - Filter by trait index
 *   sort          - "newest" (default), "oldest", "smallest", "largest",
 *                   "most_colorful", "least_colorful", "brightest", "darkest"
 */
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);

  // Pagination
  const limitParam = parseInt(searchParams.get('limit') || '50');
  const limit = Math.min(Math.max(1, limitParam), 100);
  const offset = Math.max(0, parseInt(searchParams.get('offset') || '0'));

  // Sort option (whitelist to prevent injection)
  const sortParam = searchParams.get('sort') || 'newest';
  const sort: SortOption = VALID_SORTS.includes(sortParam as SortOption)
    ? (sortParam as SortOption)
    : 'newest';

  // Optional address filters
  const settler = searchParams.get('settler')?.toLowerCase() || null;
  const winner = searchParams.get('winner')?.toLowerCase() || null;

  // Trait filters (integer indices)
  const background = parseTraitParam(searchParams.get('background'));
  const body = parseTraitParam(searchParams.get('body'));
  const accessory = parseTraitParam(searchParams.get('accessory'));
  const head = parseTraitParam(searchParams.get('head'));
  const glasses = parseTraitParam(searchParams.get('glasses'));

  try {
    const sql = ponderSql();

    const nouns = await queryWithSort(
      sql, sort, limit, offset,
      settler, winner, background, body, accessory, head, glasses
    );

    // Get filtered count
    const countResult = await sql`
      SELECT COUNT(*) as count FROM ponder_live.nouns
      WHERE (${settler}::text IS NULL OR LOWER(settled_by_address) = ${settler})
        AND (${winner}::text IS NULL OR LOWER(winner_address) = ${winner})
        AND (${background}::int IS NULL OR background = ${background})
        AND (${body}::int IS NULL OR body = ${body})
        AND (${accessory}::int IS NULL OR accessory = ${accessory})
        AND (${head}::int IS NULL OR head = ${head})
        AND (${glasses}::int IS NULL OR glasses = ${glasses})
    `;
    const total = parseInt(countResult[0]?.count || '0');

    return NextResponse.json({
      nouns,
      total,
      limit,
      offset,
    });
  } catch (error) {
    console.error('[API] Failed to fetch nouns:', error);
    return NextResponse.json(
      { error: 'Failed to fetch nouns' },
      { status: 500 }
    );
  }
}

/**
 * Run the filtered query with the appropriate ORDER BY clause.
 */
async function queryWithSort(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  sql: any,
  sort: SortOption,
  limit: number,
  offset: number,
  settler: string | null,
  winner: string | null,
  background: number | null,
  body: number | null,
  accessory: number | null,
  head: number | null,
  glasses: number | null,
) {
  switch (sort) {
    case 'oldest':
      return sql`
        SELECT id, background, body, accessory, head, glasses,
               settled_by_address, settled_by_ens, settled_at,
               winning_bid, winner_address, winner_ens,
               owner, svg, area, color_count, brightness, burned
        FROM ponder_live.nouns
        WHERE (${settler}::text IS NULL OR LOWER(settled_by_address) = ${settler})
          AND (${winner}::text IS NULL OR LOWER(winner_address) = ${winner})
          AND (${background}::int IS NULL OR background = ${background})
          AND (${body}::int IS NULL OR body = ${body})
          AND (${accessory}::int IS NULL OR accessory = ${accessory})
          AND (${head}::int IS NULL OR head = ${head})
          AND (${glasses}::int IS NULL OR glasses = ${glasses})
        ORDER BY id ASC
        LIMIT ${limit} OFFSET ${offset}
      `;

    case 'smallest':
      return sql`
        SELECT id, background, body, accessory, head, glasses,
               settled_by_address, settled_by_ens, settled_at,
               winning_bid, winner_address, winner_ens,
               owner, svg, area, color_count, brightness, burned
        FROM ponder_live.nouns
        WHERE (${settler}::text IS NULL OR LOWER(settled_by_address) = ${settler})
          AND (${winner}::text IS NULL OR LOWER(winner_address) = ${winner})
          AND (${background}::int IS NULL OR background = ${background})
          AND (${body}::int IS NULL OR body = ${body})
          AND (${accessory}::int IS NULL OR accessory = ${accessory})
          AND (${head}::int IS NULL OR head = ${head})
          AND (${glasses}::int IS NULL OR glasses = ${glasses})
        ORDER BY area ASC NULLS LAST, id ASC
        LIMIT ${limit} OFFSET ${offset}
      `;

    case 'largest':
      return sql`
        SELECT id, background, body, accessory, head, glasses,
               settled_by_address, settled_by_ens, settled_at,
               winning_bid, winner_address, winner_ens,
               owner, svg, area, color_count, brightness, burned
        FROM ponder_live.nouns
        WHERE (${settler}::text IS NULL OR LOWER(settled_by_address) = ${settler})
          AND (${winner}::text IS NULL OR LOWER(winner_address) = ${winner})
          AND (${background}::int IS NULL OR background = ${background})
          AND (${body}::int IS NULL OR body = ${body})
          AND (${accessory}::int IS NULL OR accessory = ${accessory})
          AND (${head}::int IS NULL OR head = ${head})
          AND (${glasses}::int IS NULL OR glasses = ${glasses})
        ORDER BY area DESC NULLS LAST, id DESC
        LIMIT ${limit} OFFSET ${offset}
      `;

    case 'most_colorful':
      return sql`
        SELECT id, background, body, accessory, head, glasses,
               settled_by_address, settled_by_ens, settled_at,
               winning_bid, winner_address, winner_ens,
               owner, svg, area, color_count, brightness, burned
        FROM ponder_live.nouns
        WHERE (${settler}::text IS NULL OR LOWER(settled_by_address) = ${settler})
          AND (${winner}::text IS NULL OR LOWER(winner_address) = ${winner})
          AND (${background}::int IS NULL OR background = ${background})
          AND (${body}::int IS NULL OR body = ${body})
          AND (${accessory}::int IS NULL OR accessory = ${accessory})
          AND (${head}::int IS NULL OR head = ${head})
          AND (${glasses}::int IS NULL OR glasses = ${glasses})
        ORDER BY color_count DESC NULLS LAST, id DESC
        LIMIT ${limit} OFFSET ${offset}
      `;

    case 'least_colorful':
      return sql`
        SELECT id, background, body, accessory, head, glasses,
               settled_by_address, settled_by_ens, settled_at,
               winning_bid, winner_address, winner_ens,
               owner, svg, area, color_count, brightness, burned
        FROM ponder_live.nouns
        WHERE (${settler}::text IS NULL OR LOWER(settled_by_address) = ${settler})
          AND (${winner}::text IS NULL OR LOWER(winner_address) = ${winner})
          AND (${background}::int IS NULL OR background = ${background})
          AND (${body}::int IS NULL OR body = ${body})
          AND (${accessory}::int IS NULL OR accessory = ${accessory})
          AND (${head}::int IS NULL OR head = ${head})
          AND (${glasses}::int IS NULL OR glasses = ${glasses})
        ORDER BY color_count ASC NULLS LAST, id ASC
        LIMIT ${limit} OFFSET ${offset}
      `;

    case 'brightest':
      return sql`
        SELECT id, background, body, accessory, head, glasses,
               settled_by_address, settled_by_ens, settled_at,
               winning_bid, winner_address, winner_ens,
               owner, svg, area, color_count, brightness, burned
        FROM ponder_live.nouns
        WHERE (${settler}::text IS NULL OR LOWER(settled_by_address) = ${settler})
          AND (${winner}::text IS NULL OR LOWER(winner_address) = ${winner})
          AND (${background}::int IS NULL OR background = ${background})
          AND (${body}::int IS NULL OR body = ${body})
          AND (${accessory}::int IS NULL OR accessory = ${accessory})
          AND (${head}::int IS NULL OR head = ${head})
          AND (${glasses}::int IS NULL OR glasses = ${glasses})
        ORDER BY brightness DESC NULLS LAST, id DESC
        LIMIT ${limit} OFFSET ${offset}
      `;

    case 'darkest':
      return sql`
        SELECT id, background, body, accessory, head, glasses,
               settled_by_address, settled_by_ens, settled_at,
               winning_bid, winner_address, winner_ens,
               owner, svg, area, color_count, brightness, burned
        FROM ponder_live.nouns
        WHERE (${settler}::text IS NULL OR LOWER(settled_by_address) = ${settler})
          AND (${winner}::text IS NULL OR LOWER(winner_address) = ${winner})
          AND (${background}::int IS NULL OR background = ${background})
          AND (${body}::int IS NULL OR body = ${body})
          AND (${accessory}::int IS NULL OR accessory = ${accessory})
          AND (${head}::int IS NULL OR head = ${head})
          AND (${glasses}::int IS NULL OR glasses = ${glasses})
        ORDER BY brightness ASC NULLS LAST, id ASC
        LIMIT ${limit} OFFSET ${offset}
      `;

    case 'newest':
    default:
      return sql`
        SELECT id, background, body, accessory, head, glasses,
               settled_by_address, settled_by_ens, settled_at,
               winning_bid, winner_address, winner_ens,
               owner, svg, area, color_count, brightness, burned
        FROM ponder_live.nouns
        WHERE (${settler}::text IS NULL OR LOWER(settled_by_address) = ${settler})
          AND (${winner}::text IS NULL OR LOWER(winner_address) = ${winner})
          AND (${background}::int IS NULL OR background = ${background})
          AND (${body}::int IS NULL OR body = ${body})
          AND (${accessory}::int IS NULL OR accessory = ${accessory})
          AND (${head}::int IS NULL OR head = ${head})
          AND (${glasses}::int IS NULL OR glasses = ${glasses})
        ORDER BY id DESC
        LIMIT ${limit} OFFSET ${offset}
      `;
  }
}

/**
 * Parse a trait query param to a number or null
 */
function parseTraitParam(value: string | null): number | null {
  if (value === null) return null;
  const parsed = parseInt(value);
  return isNaN(parsed) ? null : parsed;
}
