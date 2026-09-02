/**
 * Activity definition: candidate_updated
 *
 * Version 1 is the creation snapshot; version 0 is a legacy update row.
 * Never infer creation from the earliest row in a filtered/paginated window.
 *
 * Source: extracted from `useActivityFeed.ts:678-711` (processCandidateVersions)
 * and `app/api/activity/route.ts:184-194` (SQL).
 */

import type { ActivityDefinition } from '../types';
import type { ActivityItem } from '../../types';

interface ApiCandidateVersionRow {
  id: string;
  candidate_id: string;
  version_number: number;
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
        SELECT cv.id, cv.candidate_id, cv.version_number, cv.title, cv.update_message,
               cv.block_timestamp, c.slug as candidate_slug, c.proposer as candidate_proposer,
               e.name as proposer_ens
        FROM ponder_live.candidate_versions cv
        LEFT JOIN ponder_live.candidates c ON cv.candidate_id = c.id
        LEFT JOIN ponder_live.ens_names e ON LOWER(c.proposer) = LOWER(e.address)
        WHERE cv.block_timestamp >= ${since}
          AND cv.version_number <> 1
        ORDER BY cv.block_number DESC, cv.version_number DESC, cv.id DESC
        LIMIT ${limit}
      `,
  processRows: (rows): ActivityItem[] => {
    return rows
      .filter((v) => v.version_number !== 1)
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
