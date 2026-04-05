/**
 * ENS Batch Resolution API Route
 * POST /api/ens - Batch resolve addresses to ENS names/avatars
 *
 * Primary source: ponder_live.ens_names (populated during Ponder indexing).
 *
 * Staleness handling: entries older than STALE_THRESHOLD_DAYS are
 * re-resolved in a non-blocking background pass so the *next* request
 * returns fresh data without slowing down the current one.
 *
 * The response now includes `resolvedAt` (unix seconds) per address so
 * clients can reason about freshness if needed.
 */

import { NextRequest, NextResponse } from 'next/server';
import { ponderSql } from '@/app/lib/ponder-db';

/** How old (in days) before we consider an ENS entry stale and re-resolve. */
const STALE_THRESHOLD_DAYS = 7;

interface EnsEntry {
  name: string | null;
  avatar: string | null;
  resolvedAt: number | null; // unix seconds, null = not in DB
}

// ---------------------------------------------------------------------------
// Background re-resolution via ensideas.com
// ---------------------------------------------------------------------------

async function resolveEnsLive(
  address: string,
): Promise<{ name: string | null; avatar: string | null }> {
  try {
    const res = await fetch(
      `https://api.ensideas.com/ens/resolve/${address}`,
    );
    if (!res.ok) return { name: null, avatar: null };
    const data = (await res.json()) as {
      name?: string;
      avatar?: string;
    };
    return {
      name: data.name || null,
      avatar: data.avatar || null,
    };
  } catch {
    return { name: null, avatar: null };
  }
}

/**
 * Fire-and-forget: re-resolve stale addresses and upsert into the DB.
 * Runs after the response is sent so it doesn't block the client.
 */
function backgroundRefreshStale(addresses: string[]) {
  if (addresses.length === 0) return;

  // Don't await — fire and forget
  (async () => {
    try {
      const sql = ponderSql();
      const BATCH = 10;
      for (let i = 0; i < addresses.length; i += BATCH) {
        const batch = addresses.slice(i, i + BATCH);
        const results = await Promise.all(
          batch.map(async (addr) => {
            const ens = await resolveEnsLive(addr);
            return { addr, ...ens };
          }),
        );

        for (const { addr, name, avatar } of results) {
          try {
            const now = Math.floor(Date.now() / 1000);
            await sql`
              INSERT INTO ponder_live.ens_names (address, name, avatar, "resolvedAt")
              VALUES (${addr}, ${name}, ${avatar}, ${now})
              ON CONFLICT (address)
              DO UPDATE SET
                name = ${name},
                avatar = ${avatar},
                "resolvedAt" = ${now}
            `;
          } catch {
            // Individual upsert failed — don't block the rest
          }
        }
      }
    } catch (err) {
      console.error('[ENS] Background refresh failed:', err);
    }
  })();
}

// ---------------------------------------------------------------------------
// POST /api/ens — Batch resolve
// ---------------------------------------------------------------------------

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const addresses: string[] = body.addresses;

    if (!Array.isArray(addresses) || addresses.length === 0) {
      return NextResponse.json({ ens: {} });
    }

    // Limit to 100 addresses per request
    const limitedAddresses = addresses
      .slice(0, 100)
      .map((addr) => addr.toLowerCase())
      .filter((addr) => addr.startsWith('0x') && addr.length === 42);

    if (limitedAddresses.length === 0) {
      return NextResponse.json({ ens: {} });
    }

    const sql = ponderSql();

    // Query ens_names table — include resolvedAt for staleness checks
    const rows = await sql`
      SELECT address, name, avatar, "resolvedAt"
      FROM ponder_live.ens_names
      WHERE address = ANY(${limitedAddresses})
    `;

    // Build result map
    const ensMap: Record<string, EnsEntry> = {};
    const dbAddresses = new Set<string>();

    for (const row of rows) {
      const addr = (row.address as string).toLowerCase();
      dbAddresses.add(addr);
      ensMap[addr] = {
        name: row.name || null,
        avatar: row.avatar || null,
        resolvedAt: row.resolvedAt ? Number(row.resolvedAt) : null,
      };
    }

    // Fill in addresses not found in DB
    for (const addr of limitedAddresses) {
      if (!ensMap[addr]) {
        ensMap[addr] = { name: null, avatar: null, resolvedAt: null };
      }
    }

    // Identify stale entries for background refresh
    const staleThreshold =
      Math.floor(Date.now() / 1000) - STALE_THRESHOLD_DAYS * 86400;
    const staleAddresses = limitedAddresses.filter((addr) => {
      const entry = ensMap[addr];
      if (!entry) return false;
      // Never resolved, or resolved before threshold
      return (
        entry.resolvedAt === null || entry.resolvedAt < staleThreshold
      );
    });

    // Kick off background re-resolution (non-blocking)
    backgroundRefreshStale(staleAddresses);

    return NextResponse.json({ ens: ensMap });
  } catch (error) {
    console.error('[API] Failed to batch resolve ENS:', error);
    return NextResponse.json(
      { error: 'Failed to resolve ENS' },
      { status: 500 },
    );
  }
}

// ---------------------------------------------------------------------------
// GET /api/ens?address=0x... — Single address lookup
// ---------------------------------------------------------------------------

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const address = searchParams.get('address')?.toLowerCase();

  if (!address || !address.startsWith('0x') || address.length !== 42) {
    return NextResponse.json({ error: 'Invalid address' }, { status: 400 });
  }

  try {
    const sql = ponderSql();

    const rows = await sql`
      SELECT name, avatar, "resolvedAt"
      FROM ponder_live.ens_names
      WHERE address = ${address}
      LIMIT 1
    `;

    if (rows.length === 0) {
      // Not in DB — try live resolution, return result, and store
      backgroundRefreshStale([address]);
      return NextResponse.json({
        name: null,
        avatar: null,
        resolvedAt: null,
      });
    }

    const row = rows[0];
    const resolvedAt = row.resolvedAt ? Number(row.resolvedAt) : null;

    // Check staleness
    const staleThreshold =
      Math.floor(Date.now() / 1000) - STALE_THRESHOLD_DAYS * 86400;
    if (resolvedAt === null || resolvedAt < staleThreshold) {
      backgroundRefreshStale([address]);
    }

    return NextResponse.json({
      name: row.name || null,
      avatar: row.avatar || null,
      resolvedAt,
    });
  } catch (error) {
    console.error('[API] Failed to resolve ENS:', error);
    return NextResponse.json(
      { error: 'Failed to resolve ENS' },
      { status: 500 },
    );
  }
}
