/**
 * Activity definition: proposal_updated
 *
 * Surfaces proposal version rows AFTER the creation version — i.e., real
 * updates posted by the proposer. The earliest version per proposal is the
 * creation event and gets filtered out by `dedupeFirstVersion`. Empty
 * update messages are also dropped (they're valid on-chain but render as noise).
 *
 * Source: extracted from `useActivityFeed.ts:620-653` (processProposalVersions)
 * and `app/api/activity/route.ts:171-182` (SQL). The first-version dedup
 * logic moved to `activity/domain/versionDedup.ts` where it's shared with
 * candidate_updated.
 */

import type { ActivityDefinition } from '../types';
import type { ActivityItem } from '../../types';
import { dedupeFirstVersion } from '../domain/versionDedup';

interface ApiProposalVersionRow {
  id: string;
  proposal_id: string;
  title: string;
  update_message: string | null;
  block_timestamp: string;
  proposal_title: string | null;
  proposer: string;
  proposer_ens: string | null;
}

export const proposalUpdatedDefinition: ActivityDefinition<ApiProposalVersionRow> = {
  type: 'proposal_updated',
  producerKey: 'proposalVersions',
  buildQuery: ({ sql, since, limit }) => sql`
        SELECT pv.id, pv.proposal_id, pv.title, pv.update_message,
               pv.block_timestamp, p.title as proposal_title, p.proposer,
               e.name as proposer_ens
        FROM ponder_live.proposal_versions pv
        LEFT JOIN ponder_live.proposals p ON pv.proposal_id = p.id
        LEFT JOIN ponder_live.ens_names e ON LOWER(p.proposer) = LOWER(e.address)
        WHERE pv.block_timestamp >= ${since}
        ORDER BY pv.block_timestamp DESC
        LIMIT ${limit}
      `,
  processRows: (rows): ActivityItem[] => {
    const afterDedup = dedupeFirstVersion(
      rows,
      (v) => String(v.proposal_id),
      (v) => String(v.block_timestamp),
    );
    return afterDedup
      .filter((v) => v.update_message && v.update_message.trim() !== '')
      .map((v) => ({
        id: `proposal-updated-${v.id}`,
        type: 'proposal_updated' as const,
        timestamp: String(v.block_timestamp),
        actor: v.proposer,
        actorEns: v.proposer_ens || undefined,
        proposalId: String(v.proposal_id),
        proposalTitle: v.title || v.proposal_title || '',
        updateMessage: v.update_message!,
      }));
  },
};
