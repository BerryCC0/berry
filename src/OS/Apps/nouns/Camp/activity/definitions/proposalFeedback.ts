/**
 * Activity definition: proposal_feedback
 *
 * Source: extracted from `useActivityFeed.ts:213-224` (processProposalFeedback)
 * and `app/api/activity/route.ts:34-44` (SQL block). Behavior preserved exactly.
 */

import type { ActivityDefinition } from '../types';
import type { ActivityItem } from '../../types';

interface ApiProposalFeedbackRow {
  id: string;
  msg_sender: string;
  sender_ens: string | null;
  proposal_id: string;
  proposal_title: string | null;
  support: number;
  reason: string | null;
  block_timestamp: string;
}

export const proposalFeedbackDefinition: ActivityDefinition<ApiProposalFeedbackRow> = {
  type: 'proposal_feedback',
  producerKey: 'proposalFeedback',
  buildQuery: ({ sql, since, limit }) => sql`
        SELECT pf.id, pf.msg_sender, pf.proposal_id, pf.support, pf.reason,
               pf.block_timestamp, p.title as proposal_title,
               e.name as sender_ens
        FROM ponder_live.proposal_feedback pf
        LEFT JOIN ponder_live.proposals p ON pf.proposal_id = p.id
        LEFT JOIN ponder_live.ens_names e ON LOWER(pf.msg_sender) = LOWER(e.address)
        WHERE pf.block_timestamp >= ${since}
        ORDER BY pf.block_timestamp DESC
        LIMIT ${limit}
      `,
  processRows: (rows): ActivityItem[] =>
    rows.map((f) => ({
      id: `feedback-${f.id}`,
      type: 'proposal_feedback' as const,
      timestamp: String(f.block_timestamp),
      actor: f.msg_sender,
      actorEns: f.sender_ens || undefined,
      proposalId: String(f.proposal_id),
      proposalTitle: f.proposal_title || '',
      support: f.support,
      reason: f.reason || undefined,
    })),
};
