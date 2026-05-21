/**
 * Activity definition: candidate_created
 *
 * Source: extracted from `useActivityFeed.ts:364-374` (processCandidates) and
 * `app/api/activity/route.ts:74-89` (SQL). The SQL excludes candidates that
 * have already been promoted to a proposal — those surface via the
 * `proposal_created` item instead, with `promotedFromCandidate` populated.
 */

import type { ActivityDefinition } from '../types';
import type { ActivityItem } from '../../types';

interface ApiCandidateRow {
  id: string;
  proposer: string;
  proposer_ens: string | null;
  slug: string;
  title: string;
  created_timestamp: string;
}

export const candidateCreatedDefinition: ActivityDefinition<ApiCandidateRow> = {
  type: 'candidate_created',
  producerKey: 'candidates',
  buildQuery: ({ sql, since, limit }) => sql`
        SELECT c.id, c.proposer, c.slug, c.title, c.created_timestamp,
               e.name as proposer_ens
        FROM ponder_live.candidates c
        LEFT JOIN ponder_live.ens_names e ON LOWER(c.proposer) = LOWER(e.address)
        WHERE c.canceled = false AND c.created_timestamp >= ${since}
          AND NOT EXISTS (
            SELECT 1 FROM ponder_live.proposals p
            WHERE p.encoded_proposal_hash IS NOT NULL
              AND p.encoded_proposal_hash = c.encoded_proposal_hash
          )
        ORDER BY c.created_timestamp DESC
        LIMIT ${limit}
      `,
  processRows: (rows): ActivityItem[] =>
    rows.map((c) => ({
      id: `candidate-created-${c.id}`,
      type: 'candidate_created' as const,
      timestamp: String(c.created_timestamp),
      actor: c.proposer,
      actorEns: c.proposer_ens || undefined,
      candidateSlug: c.slug,
      candidateTitle: c.title,
      candidateProposer: c.proposer,
    })),
};
