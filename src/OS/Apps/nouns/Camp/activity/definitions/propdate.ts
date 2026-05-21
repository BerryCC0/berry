/**
 * Activity definition: propdate_posted
 *
 * Source: extracted from `useActivityFeed.ts:725-741` (processPropdates) and
 * `app/api/activity/route.ts:203-214` (SQL block). Behavior preserved exactly,
 * including the empty-update filter (on-chain propdates with empty body strings
 * are valid but render as noise).
 */

import type { ActivityDefinition } from '../types';
import type { ActivityItem } from '../../types';

interface ApiPropdateRow {
  id: string;
  proposal_id: number;
  is_completed: boolean;
  update: string;
  admin: string;
  admin_ens: string | null;
  proposal_title: string | null;
  block_timestamp: string;
  tx_hash: string;
}

export const propdateDefinition: ActivityDefinition<ApiPropdateRow> = {
  type: 'propdate_posted',
  producerKey: 'propdates',
  buildQuery: ({ sql, since, limit }) => sql`
        SELECT pu.id, pu.proposal_id, pu.is_completed, pu.update, pu.admin,
               pu.block_timestamp, pu.tx_hash,
               p.title as proposal_title,
               e.name as admin_ens
        FROM ponder_live.propdates pu
        LEFT JOIN ponder_live.proposals p ON pu.proposal_id = p.id
        LEFT JOIN ponder_live.ens_names e ON LOWER(pu.admin) = LOWER(e.address)
        WHERE pu.block_timestamp >= ${since}
        ORDER BY pu.block_timestamp DESC
        LIMIT ${limit}
      `,
  processRows: (rows): ActivityItem[] =>
    rows
      .filter((p) => p.update && p.update.trim() !== '')
      .map((p) => ({
        id: `propdate-${p.id}`,
        type: 'propdate_posted' as const,
        timestamp: String(p.block_timestamp),
        actor: p.admin,
        actorEns: p.admin_ens || undefined,
        proposalId: String(p.proposal_id),
        proposalTitle: p.proposal_title || '',
        propdateUpdate: p.update,
        propdateIsCompleted: p.is_completed,
        txHash: p.tx_hash,
      })),
};
