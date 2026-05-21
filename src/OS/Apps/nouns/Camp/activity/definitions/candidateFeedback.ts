/**
 * Activity definition: candidate_feedback
 *
 * Source: extracted from `useActivityFeed.ts:377-390` (processCandidateFeedback)
 * and `app/api/activity/route.ts:91-102` (SQL). The legacy `votes ?? '1'`
 * fallback is preserved — early candidate feedback rows lack a votes column.
 */

import type { ActivityDefinition } from '../types';
import type { ActivityItem } from '../../types';

interface ApiCandidateFeedbackRow {
  id: string;
  msg_sender: string;
  sender_ens: string | null;
  support: number;
  reason: string | null;
  block_timestamp: string;
  candidate_slug: string;
  candidate_proposer: string;
  candidate_title: string;
  votes: string | null;
}

export const candidateFeedbackDefinition: ActivityDefinition<ApiCandidateFeedbackRow> = {
  type: 'candidate_feedback',
  producerKey: 'candidateFeedback',
  buildQuery: ({ sql, since, limit }) => sql`
        SELECT cf.id, cf.msg_sender, cf.candidate_id, cf.support, cf.reason,
               cf.block_timestamp, c.slug as candidate_slug, c.proposer as candidate_proposer,
               c.title as candidate_title,
               e.name as sender_ens
        FROM ponder_live.candidate_feedback cf
        LEFT JOIN ponder_live.candidates c ON cf.candidate_id = c.id
        LEFT JOIN ponder_live.ens_names e ON LOWER(cf.msg_sender) = LOWER(e.address)
        WHERE cf.block_timestamp >= ${since}
        ORDER BY cf.block_timestamp DESC
        LIMIT ${limit}
      `,
  processRows: (rows): ActivityItem[] =>
    rows.map((f) => ({
      id: `candidate-feedback-${f.id}`,
      type: 'candidate_feedback' as const,
      timestamp: String(f.block_timestamp),
      actor: f.msg_sender,
      actorEns: f.sender_ens || undefined,
      candidateSlug: f.candidate_slug,
      candidateProposer: f.candidate_proposer,
      candidateTitle: f.candidate_title,
      support: f.support,
      votes: String(f.votes ?? '1'),
      reason: f.reason || undefined,
    })),
};
