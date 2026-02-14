/**
 * ENS Batch Resolution API Route
 * POST /api/ens - Batch resolve addresses to ENS names/avatars
 * 
 * Queries the ens_names table (populated by Ponder during indexing)
 * to avoid slow on-chain RPC calls.
 */

import { NextRequest, NextResponse } from 'next/server';
import { ponderSql } from '@/app/lib/ponder-db';

interface EnsData {
  name: string | null;
  avatar: string | null;
}

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
      .map(addr => addr.toLowerCase())
      .filter(addr => addr.startsWith('0x') && addr.length === 42);

    if (limitedAddresses.length === 0) {
      return NextResponse.json({ ens: {} });
    }

    const sql = ponderSql();

    // Query ens_names table for all requested addresses
    const rows = await sql`
      SELECT address, name, avatar
      FROM ponder_live.ens_names
      WHERE address = ANY(${limitedAddresses})
    `;

    // Build result map
    const ensMap: Record<string, EnsData> = {};
    
    // Initialize all requested addresses with null values
    for (const addr of limitedAddresses) {
      ensMap[addr] = { name: null, avatar: null };
    }
    
    // Populate with actual data from DB
    for (const row of rows) {
      const addr = (row.address as string).toLowerCase();
      ensMap[addr] = {
        name: row.name || null,
        avatar: row.avatar || null,
      };
    }

    return NextResponse.json({ ens: ensMap });
  } catch (error) {
    console.error('[API] Failed to batch resolve ENS:', error);
    return NextResponse.json(
      { error: 'Failed to resolve ENS' },
      { status: 500 }
    );
  }
}

// Also support GET for single address lookups
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const address = searchParams.get('address')?.toLowerCase();

  if (!address || !address.startsWith('0x') || address.length !== 42) {
    return NextResponse.json({ error: 'Invalid address' }, { status: 400 });
  }

  try {
    const sql = ponderSql();

    const rows = await sql`
      SELECT name, avatar
      FROM ponder_live.ens_names
      WHERE address = ${address}
      LIMIT 1
    `;

    if (rows.length === 0) {
      return NextResponse.json({ name: null, avatar: null });
    }

    return NextResponse.json({
      name: rows[0].name || null,
      avatar: rows[0].avatar || null,
    });
  } catch (error) {
    console.error('[API] Failed to resolve ENS:', error);
    return NextResponse.json(
      { error: 'Failed to resolve ENS' },
      { status: 500 }
    );
  }
}
