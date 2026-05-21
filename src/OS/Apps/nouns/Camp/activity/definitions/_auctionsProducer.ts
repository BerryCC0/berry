/**
 * Shared scaffolding for the auctions producer. Two definitions — auction_settled
 * and auction_started — both read these rows. NOT registered itself.
 *
 * Source: extracted from `useActivityFeed.ts:570-617` (processAuctions). The
 * dead `auctionStartedItems`/`auctionSettledItems` arrays from the legacy
 * return shape are gone — the orchestrator's caller only ever consumed
 * `.items` (verified during the PR1 audit at `useActivityFeed.ts:846`).
 */

import { AUCTION_HOUSE } from '../domain/transferFilters';
import type { QueryContext } from '../types';

/** Row shape selected by `buildAuctionsQuery`. */
export interface ApiAuctionRow {
  noun_id: string;
  start_time: string;
  end_time: string;
  winner: string | null;
  winner_ens: string | null;
  amount: string | null;
  settled: boolean;
  /** From the nouns table — the settler of auction N-1 chose THIS noun's appearance. */
  noun_settler_address: string | null;
  settler_ens: string | null;
}

/** SQL for the auctions producer. Set on auctionSettled (alphabetical winner). */
export const buildAuctionsQuery = ({ sql, since, limit }: QueryContext) => sql`
        SELECT a.noun_id, a.start_time, a.end_time, a.winner, a.amount, a.settled,
               n.settled_by_address AS noun_settler_address,
               ew.name as winner_ens,
               es.name as settler_ens
        FROM ponder_live.auctions a
        LEFT JOIN ponder_live.nouns n ON a.noun_id = n.id
        LEFT JOIN ponder_live.ens_names ew ON LOWER(a.winner) = LOWER(ew.address)
        LEFT JOIN ponder_live.ens_names es ON LOWER(n.settled_by_address) = LOWER(es.address)
        WHERE a.start_time >= ${since}
        ORDER BY a.start_time DESC
        LIMIT ${limit}
      `;

/** Re-export so the auction definitions don't need to know about transferFilters. */
export { AUCTION_HOUSE };
