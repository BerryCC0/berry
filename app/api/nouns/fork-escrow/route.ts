/**
 * GET /api/nouns/fork-escrow
 *
 * Returns the set of Nouns currently held by the Nouns DAO Fork Escrow
 * contract, with each Noun's *original depositor* (the address that
 * escrowed it). Used by the Camp proposal-creator's withdraw/return
 * editors so proposers can pick from the live escrow contents instead of
 * hand-typing token IDs.
 *
 * Data path:
 *   • Currently-escrowed = `ponder_live.nouns WHERE LOWER(owner) = forkEscrow`
 *   • Original depositor = the `from` of the most recent transfer where
 *     `to = forkEscrow` for each tokenId (the Noun's last entry into escrow).
 *   • ENS name = optional join against the indexer's ens_names cache.
 */

import { NextResponse } from 'next/server';
import { NOUNS_ADDRESSES } from '@/app/lib/nouns/contracts';
import { ponderSql } from '@/app/lib/ponder-db';

export interface EscrowedNoun {
  tokenId: number;
  /** The address that originally deposited the Noun into escrow. */
  originalOwner: string;
  /** Resolved ENS name for the original owner, if cached. */
  originalOwnerEns: string | null;
}

export interface ForkEscrowResponse {
  /** Lowercased fork escrow address — included so the client can sanity-check. */
  forkEscrow: string;
  totalEscrowed: number;
  nouns: EscrowedNoun[];
}

export async function GET() {
  try {
    const sql = ponderSql();
    const forkEscrow = NOUNS_ADDRESSES.forkEscrow.toLowerCase();

    const rows = await sql`
      SELECT
        n.id AS token_id,
        t.original_from AS original_owner,
        e.name AS original_owner_ens
      FROM ponder_live.nouns n
      CROSS JOIN LATERAL (
        SELECT "from" AS original_from
        FROM ponder_live.transfers
        WHERE token_id = n.id
          AND LOWER("to") = ${forkEscrow}
        ORDER BY block_number DESC
        LIMIT 1
      ) t
      LEFT JOIN ponder_live.ens_names e
        ON LOWER(e.address) = LOWER(t.original_from)
      WHERE LOWER(n.owner) = ${forkEscrow}
      ORDER BY n.id ASC
    `;

    const nouns: EscrowedNoun[] = rows.map((r) => ({
      tokenId: Number(r.token_id),
      originalOwner: String(r.original_owner).toLowerCase(),
      originalOwnerEns: r.original_owner_ens
        ? String(r.original_owner_ens)
        : null,
    }));

    const body: ForkEscrowResponse = {
      forkEscrow,
      totalEscrowed: nouns.length,
      nouns,
    };
    return NextResponse.json(body, {
      headers: { 'Cache-Control': 's-maxage=60, stale-while-revalidate=300' },
    });
  } catch (err) {
    console.error('[fork-escrow] query failed:', err);
    return NextResponse.json(
      { error: 'Failed to load fork escrow contents' },
      { status: 500 },
    );
  }
}
