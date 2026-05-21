/**
 * Activity definition: auction_settled
 *
 * Owns `buildQuery` for the `auctions` producer (shared with auctionStarted).
 * Emits one item per settled auction row that has a winner.
 *
 * Source: extracted from `useActivityFeed.ts:585-600` (the settled branch
 * of processAuctions).
 */

import type { ActivityDefinition } from '../types';
import type { ActivityItem } from '../../types';
import { ApiAuctionRow, buildAuctionsQuery } from './_auctionsProducer';

export const auctionSettledDefinition: ActivityDefinition<ApiAuctionRow> = {
  type: 'auction_settled',
  producerKey: 'auctions',
  buildQuery: buildAuctionsQuery,
  processRows: (rows): ActivityItem[] => {
    const items: ActivityItem[] = [];
    for (const a of rows) {
      if (!a.settled || !a.winner) continue;
      items.push({
        id: `auction-settled-${a.noun_id}`,
        type: 'auction_settled',
        timestamp: String(a.end_time),
        actor: a.winner,
        actorEns: a.winner_ens || undefined,
        nounId: String(a.noun_id),
        winningBid: String(a.amount),
        winner: a.winner,
        winnerEns: a.winner_ens || undefined,
        settler: a.noun_settler_address || undefined,
        settlerEns: a.settler_ens || undefined,
      });
    }
    return items;
  },
};
