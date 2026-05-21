/**
 * Activity definition: noun_swap
 *
 * Source: extracted from `useActivityFeed.ts:656-675` (processSwaps) and
 * `app/api/activity/route.ts:195-206` (SQL). Surfaces $nouns NFTBackedToken
 * Deposit / Redeem / Swap events as a single activity type with a `swapKind`
 * discriminator. The constituent Noun transfers from these events are
 * filtered out of the `transfers` producer to avoid duplication.
 */

import type { ActivityDefinition } from '../types';
import type { ActivityItem } from '../../types';

interface ApiSwapRow {
  id: string;
  kind: 'deposit' | 'redeem' | 'swap';
  actor: string;
  actor_ens: string | null;
  tokens_in: number[] | null;
  tokens_out: number[] | null;
  block_timestamp: string;
  tx_hash: string;
}

export const swapDefinition: ActivityDefinition<ApiSwapRow> = {
  type: 'noun_swap',
  producerKey: 'swaps',
  buildQuery: ({ sql, since, limit }) => sql`
        SELECT s.id, s.kind, s.actor, s.tokens_in, s.tokens_out,
               s.block_timestamp, s.tx_hash,
               e.name as actor_ens
        FROM ponder_live.token_swap_events s
        LEFT JOIN ponder_live.ens_names e ON LOWER(s.actor) = LOWER(e.address)
        WHERE s.block_timestamp >= ${since}
        ORDER BY s.block_timestamp DESC
        LIMIT ${limit}
      `,
  processRows: (rows): ActivityItem[] =>
    rows.map((s) => {
      const tokensIn = (s.tokens_in ?? []).map(String);
      const tokensOut = (s.tokens_out ?? []).map(String);
      // Prefer outbound IDs (what the actor received) for the primary
      // thumbnail; fall back to inbound for deposits.
      const primaryNounId = tokensOut[0] ?? tokensIn[0];
      return {
        id: `swap-${s.id}`,
        type: 'noun_swap' as const,
        timestamp: String(s.block_timestamp),
        actor: s.actor,
        actorEns: s.actor_ens || undefined,
        txHash: s.tx_hash,
        swapKind: s.kind,
        nounIdsIn: tokensIn,
        nounIdsOut: tokensOut,
        nounId: primaryNounId,
      };
    }),
};
