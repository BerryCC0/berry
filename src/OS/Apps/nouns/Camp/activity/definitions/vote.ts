/**
 * Activity definition: vote
 *
 * Source: extracted from `useActivityFeed.ts:197-211` (processVotes) and
 * `app/api/activity/route.ts:22-32` (SQL block). Behavior preserved exactly.
 */

import type { ActivityDefinition } from '../types';
import type { ActivityItem } from '../../types';

interface ApiVoteRow {
  id: string;
  voter: string;
  voter_ens: string | null;
  proposal_id: string;
  proposal_title: string | null;
  support: number;
  votes: string;
  reason: string | null;
  client_id: number | null;
  block_timestamp: string;
}

export const voteDefinition: ActivityDefinition<ApiVoteRow> = {
  type: 'vote',
  producerKey: 'votes',
  buildQuery: ({ sql, since, limit }) => sql`
        SELECT v.id, v.voter, v.proposal_id, v.support, v.votes, v.reason,
               v.client_id, v.block_timestamp, p.title as proposal_title,
               e.name as voter_ens
        FROM ponder_live.votes v
        LEFT JOIN ponder_live.proposals p ON v.proposal_id = p.id
        LEFT JOIN ponder_live.ens_names e ON LOWER(v.voter) = LOWER(e.address)
        WHERE v.block_timestamp >= ${since}
        ORDER BY v.block_timestamp DESC
        LIMIT ${limit}
      `,
  processRows: (rows): ActivityItem[] =>
    rows.map((v) => ({
      id: `vote-${v.id}`,
      type: 'vote' as const,
      timestamp: String(v.block_timestamp),
      actor: v.voter,
      actorEns: v.voter_ens || undefined,
      proposalId: String(v.proposal_id),
      proposalTitle: v.proposal_title || '',
      support: v.support,
      votes: String(v.votes),
      reason: v.reason || undefined,
      clientId: v.client_id ?? undefined,
    })),
};
