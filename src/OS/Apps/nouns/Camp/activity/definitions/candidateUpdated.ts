/**
 * Activity definition: candidate_updated
 *
 * Mirror of `proposalUpdated.ts` for candidates: drop the first version per
 * candidate (the creation), drop empty update messages, surface the rest.
 *
 * Source: extracted from `useActivityFeed.ts:678-711` (processCandidateVersions)
 * and `app/api/activity/route.ts:184-194` (SQL).
 */

import type { ActivityDefinition } from '../types';
import type { ActivityItem } from '../../types';
import { dedupeFirstVersion } from '../domain/versionDedup';

interface ApiCandidateVersionRow {
  id: string;
  candidate_id: string;
  title: string;
  update_message: string | null;
  block_timestamp: string;
  candidate_slug: string;
  candidate_proposer: string;
  proposer_ens: string | null;
}

export const candidateUpdatedDefinition: ActivityDefinition<ApiCandidateVersionRow> = {
  type: 'candidate_updated',
  producerKey: 'candidateVersions',
  buildQuery: ({ sql, since, limit }) => sql`
        SELECT cv.id, cv.candidate_id, cv.title, cv.update_message,
               cv.block_timestamp, c.slug as candidate_slug, c.proposer as candidate_proposer,
               e.name as proposer_ens
        FROM ponder_live.candidate_versions cv
        LEFT JOIN ponder_live.candidates c ON cv.candidate_id = c.id
        LEFT JOIN ponder_live.ens_names e ON LOWER(c.proposer) = LOWER(e.address)
        WHERE cv.block_timestamp >= ${since}
        ORDER BY cv.block_timestamp DESC
        LIMIT ${limit}
      `,
  processRows: (rows): ActivityItem[] => {
    const afterDedup = dedupeFirstVersion(
      rows,
      (v) => v.candidate_id,
      (v) => String(v.block_timestamp),
    );
    return afterDedup
      .filter((v) => v.update_message && v.update_message.trim() !== '')
      .map((v) => ({
        id: `candidate-updated-${v.id}`,
        type: 'candidate_updated' as const,
        timestamp: String(v.block_timestamp),
        actor: v.candidate_proposer,
        actorEns: v.proposer_ens || undefined,
        candidateSlug: v.candidate_slug,
        candidateProposer: v.candidate_proposer,
        candidateTitle: v.title,
        updateMessage: v.update_message!,
      }));
  },
};
