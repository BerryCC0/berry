/**
 * ENS Batch Resolution API Route
 * POST /api/ens              — batch resolve addresses to ENS names/avatars
 * GET  /api/ens?address=0x…  — single address lookup
 *
 * Source of truth: ponder_live.ens_names, populated by the Ponder indexer.
 *
 * This route is READ-ONLY by design. ponder_live.* are Ponder-owned tables
 * guarded by live-query/reorg triggers, so the frontend cannot write them — an
 * earlier "background refresh" upsert here silently failed on *every* call (it
 * named a non-existent column, `"resolvedAt"` vs the real `resolved_at`, and
 * targeted a non-writable view). It has been removed rather than fixed, because
 * writing the indexer's tables from the frontend is neither possible nor the
 * right layering.
 *
 * Healing of missing / stale / poisoned rows happens two other ways:
 *   - the indexer re-resolves addresses as it sees new events, and no longer
 *     persists failed lookups as nulls (see ponder/src/helpers/ens.ts), and
 *   - the client (src/OS/hooks/useEnsData.ts) resolves any null-name address
 *     live via ensideas for display.
 *
 * `resolvedAt` (unix seconds, null = not in DB) is returned per address for
 * clients that want to reason about freshness.
 */

import { NextRequest, NextResponse } from 'next/server';
import { ponderSql } from '@/app/lib/ponder-db';

interface EnsEntry {
  name: string | null;
  avatar: string | null;
  resolvedAt: number | null; // unix seconds, null = not in DB
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

    // Limit to 100 addresses per request; normalize and validate
    const limitedAddresses = addresses
      .slice(0, 100)
      .map((addr) => addr.toLowerCase())
      .filter((addr) => addr.startsWith('0x') && addr.length === 42);

    if (limitedAddresses.length === 0) {
      return NextResponse.json({ ens: {} });
    }

    const sql = ponderSql();

    const rows = await sql`
      SELECT address, name, avatar, resolved_at AS "resolvedAt"
      FROM ponder_live.ens_names
      WHERE address = ANY(${limitedAddresses})
    `;

    // Build result map, defaulting addresses not present in the DB to nulls.
    const ensMap: Record<string, EnsEntry> = {};
    for (const row of rows) {
      const addr = (row.address as string).toLowerCase();
      ensMap[addr] = {
        name: row.name || null,
        avatar: row.avatar || null,
        resolvedAt: row.resolvedAt ? Number(row.resolvedAt) : null,
      };
    }
    for (const addr of limitedAddresses) {
      if (!ensMap[addr]) {
        ensMap[addr] = { name: null, avatar: null, resolvedAt: null };
      }
    }

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
      SELECT name, avatar, resolved_at AS "resolvedAt"
      FROM ponder_live.ens_names
      WHERE address = ${address}
      LIMIT 1
    `;

    if (rows.length === 0) {
      return NextResponse.json({ name: null, avatar: null, resolvedAt: null });
    }

    const row = rows[0];
    return NextResponse.json({
      name: row.name || null,
      avatar: row.avatar || null,
      resolvedAt: row.resolvedAt ? Number(row.resolvedAt) : null,
    });
  } catch (error) {
    console.error('[API] Failed to resolve ENS:', error);
    return NextResponse.json(
      { error: 'Failed to resolve ENS' },
      { status: 500 },
    );
  }
}
