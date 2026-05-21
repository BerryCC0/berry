/**
 * Activity definition: auction_started
 *
 * Reads from the shared `auctions` producer (buildQuery on auctionSettled).
 * Emits one item per UNsettled auction row. The actor is the settler of the
 * prior auction — the person who chose THIS noun's appearance — falling
 * back to the AuctionHouse address when unknown.
 *
 * Source: extracted from `useActivityFeed.ts:601-614` (the !settled branch
 * of processAuctions).
 */

import type { ActivityDefinition } from '../types';
import type { ActivityItem } from '../../types';
import { ApiAuctionRow, AUCTION_HOUSE } from './_auctionsProducer';

export const auctionStartedDefinition: ActivityDefinition<ApiAuctionRow> = {
  type: 'auction_started',
  producerKey: 'auctions',
  processRows: (rows): ActivityItem[] => {
    const items: ActivityItem[] = [];
    for (const a of rows) {
      if (a.settled) continue;
      const nounSettler = a.noun_settler_address || undefined;
      const settlerEns = a.settler_ens || undefined;
      items.push({
        id: `auction-started-${a.noun_id}`,
        type: 'auction_started',
        timestamp: String(a.start_time),
        actor: nounSettler || AUCTION_HOUSE,
        actorEns: settlerEns,
        nounId: String(a.noun_id),
        settler: nounSettler,
        settlerEns,
      });
    }
    return items;
  },
};
