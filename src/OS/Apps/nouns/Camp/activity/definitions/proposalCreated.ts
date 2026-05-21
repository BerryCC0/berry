/**
 * Activity definition: proposal_created
 *
 * Owns `buildQuery` for the `proposals` producer (shared with the 5
 * outcome definitions and proposal_voting_started — see `_proposalProducer.ts`
 * and `registry.ts`).
 *
 * Emits a `proposal_created` item only when the derived status is `active`
 * or `pending`. Terminal statuses are handled by the outcome definitions.
 * `promotedFromCandidate` is populated when the proposals SQL's LEFT JOIN
 * on `encoded_proposal_hash` finds a matching candidate.
 *
 * Source: extracted from `useActivityFeed.ts:186-266` (the active/pending
 * emission half of processProposals).
 */

import type { ActivityDefinition } from '../types';
import type { ActivityItem } from '../../types';
import { deriveProposalStatus } from '../domain/proposalStatus';
import { ApiProposalRow, buildProposalsQuery } from './_proposalProducer';

export const proposalCreatedDefinition: ActivityDefinition<ApiProposalRow> = {
  type: 'proposal_created',
  producerKey: 'proposals',
  buildQuery: buildProposalsQuery,
  processRows: (rows, ctx): ActivityItem[] => {
    const items: ActivityItem[] = [];
    for (const p of rows) {
      const { derivedStatus } = deriveProposalStatus(p, ctx.currentBlock);
      if (derivedStatus !== 'active' && derivedStatus !== 'pending') continue;

      const promotedFromCandidate =
        p.promoted_from_candidate_slug && p.promoted_from_candidate_proposer
          ? {
              slug: p.promoted_from_candidate_slug,
              proposer: p.promoted_from_candidate_proposer,
              title: p.promoted_from_candidate_title || p.title,
            }
          : undefined;

      items.push({
        id: `proposal-created-${p.id}`,
        type: 'proposal_created',
        timestamp: String(p.created_timestamp),
        actor: p.proposer,
        actorEns: p.proposer_ens || undefined,
        proposalId: String(p.id),
        proposalTitle: p.title,
        proposalStatus: derivedStatus,
        clientId: p.client_id ?? undefined,
        promotedFromCandidate,
      });
    }
    return items;
  },
};
