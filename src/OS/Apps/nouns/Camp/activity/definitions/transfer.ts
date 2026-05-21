/**
 * Activity definition: noun_transfer
 *
 * Two-stage pipeline:
 *   1. Filter out system transfers (mints, auction settlements, treasury
 *      moves) via `isMintOrAuctionTransfer`.
 *   2. Pass the remainder through `groupTransfers`, which clusters single-tx
 *      multi-noun moves AND same-pair-within-1hr cross-tx clusters.
 *
 * The SQL also excludes any transfer whose txHash appears in
 * `token_swap_events` — those are surfaced as `noun_swap` items so the
 * underlying ERC-721 transfers shouldn't double up.
 *
 * Source: extracted from `useActivityFeed.ts:393-547` (processTransfers).
 * Filtering and grouping logic moved to `activity/domain/`.
 */

import type { ActivityDefinition } from '../types';
import type { ActivityItem } from '../../types';
import { isMintOrAuctionTransfer } from '../domain/transferFilters';
import { groupTransfers } from '../domain/transferGrouping';

interface ApiTransferRow {
  id: string;
  from: string;
  to: string;
  from_ens: string | null;
  to_ens: string | null;
  token_id: string;
  block_timestamp: string;
  tx_hash: string | null;
}

export const transferDefinition: ActivityDefinition<ApiTransferRow> = {
  type: 'noun_transfer',
  producerKey: 'transfers',
  buildQuery: ({ sql, since, limit }) => sql`
        SELECT t.id, t."from", t."to", t.token_id, t.block_timestamp, t.tx_hash,
               ef.name as from_ens,
               et.name as to_ens
        FROM ponder_live.transfers t
        LEFT JOIN ponder_live.ens_names ef ON LOWER(t."from") = LOWER(ef.address)
        LEFT JOIN ponder_live.ens_names et ON LOWER(t."to") = LOWER(et.address)
        WHERE t.block_timestamp >= ${since}
          AND t."from" != '0x0000000000000000000000000000000000000000'
          AND t."from" != '0x830bd73e4184cef73443c15111a1df14e495c706'
          AND t."to" != '0x0000000000000000000000000000000000000000'
          AND NOT (t."from" = '0xb1a32FC9F9D8b2cf86C068Cae13108809547ef71' AND t."to" = '0x830bd73e4184cef73443c15111a1df14e495c706')
          AND NOT EXISTS (
            SELECT 1 FROM ponder_live.token_swap_events s
            WHERE s.tx_hash = t.tx_hash
          )
        ORDER BY t.block_timestamp DESC
        LIMIT ${limit}
      `,
  processRows: (rows): ActivityItem[] => {
    // SQL already excludes the system-level transfers, but we keep the JS
    // filter as belt-and-suspenders — protects against schema changes that
    // might reintroduce them and matches the legacy code path exactly.
    const items: ActivityItem[] = [];
    for (const t of rows) {
      if (isMintOrAuctionTransfer(t.from, t.to)) continue;
      items.push({
        id: `transfer-${t.id}`,
        type: 'noun_transfer',
        timestamp: String(t.block_timestamp),
        actor: (t.from || '').toLowerCase(),
        actorEns: t.from_ens || undefined,
        nounId: String(t.token_id),
        fromAddress: t.from,
        fromAddressEns: t.from_ens || undefined,
        toAddress: t.to,
        toAddressEns: t.to_ens || undefined,
        txHash: t.tx_hash || undefined,
      });
    }
    return groupTransfers(items);
  },
};
