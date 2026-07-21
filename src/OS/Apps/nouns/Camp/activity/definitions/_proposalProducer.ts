/**
 * Shared scaffolding for the 7 activity definitions that read from the
 * `proposals` producer (proposal_created, proposal_voting_started, plus the
 * 5 outcome types). NOT registered itself — see `registry.ts`.
 *
 *   - `ApiProposalRow` — the shared row shape selected by buildQuery.
 *   - `buildProposalsQuery` — the SQL, set on the proposalCreated def only.
 *   - `buildOutcomeItem` — emit one outcome ActivityItem with the stable id
 *     `proposal-outcome-${id}` so React reuses the DOM row as a proposal
 *     transitions SUCCEEDED → QUEUED → EXECUTED.
 *   - `makeOutcomeProcessor` — factory that returns `processRows` for an
 *     outcome definition. Wraps the deriveProposalStatus + classifyOutcome
 *     check + buildOutcomeItem call so each outcome def stays a one-liner.
 */

import type { ActivityItem, ActivityType } from '../../types';
import type { ProcessContext, QueryContext } from '../types';
import type { ProposalOutcome } from '../domain/proposalStatus';
import { classifyOutcome, deriveProposalStatus } from '../domain/proposalStatus';

/**
 * Row shape from the proposals SQL query. Used by all 7 proposal-cluster
 * definitions. Fields are typed loosely (`string | null` where nullable)
 * to match the SELECT exactly.
 */
export interface ApiProposalRow {
  id: string;
  title: string;
  proposer: string;
  proposer_ens: string | null;
  created_timestamp: string;
  start_block: string;
  end_block: string;
  start_timestamp: string | null;
  end_timestamp: string | null;
  status: string | null;
  for_votes: string | null;
  against_votes: string | null;
  quorum_votes: string | null;
  cancelled_timestamp: string | null;
  /** Who cancelled — null until the indexer deployment adding it has synced. */
  cancelled_by: string | null;
  queued_timestamp: string | null;
  executed_timestamp: string | null;
  vetoed_timestamp: string | null;
  client_id?: number | null;
  promoted_from_candidate_slug?: string | null;
  promoted_from_candidate_proposer?: string | null;
  promoted_from_candidate_title?: string | null;
}

/**
 * SQL for the proposals producer. Set as `buildQuery` on the proposal_created
 * definition only — the other 6 defs share the rows via their producerKey.
 */
export const buildProposalsQuery = ({ sql, since, limit }: QueryContext) => sql`
        SELECT p.id, p.title, p.proposer, p.created_timestamp, p.start_block, p.end_block,
               p.start_timestamp, p.end_timestamp,
               p.status, p.for_votes, p.against_votes, p.quorum_votes, p.client_id,
               p.cancelled_timestamp, p.queued_timestamp, p.executed_timestamp, p.vetoed_timestamp,
               -- Read cancelled_by via JSON so this query still works against an
               -- indexer deployment that predates the column (missing key → NULL,
               -- instead of "column does not exist" taking down the whole feed).
               to_jsonb(p) ->> 'cancelled_by' AS cancelled_by,
               e.name as proposer_ens,
               c.slug as promoted_from_candidate_slug,
               c.proposer as promoted_from_candidate_proposer,
               c.title as promoted_from_candidate_title
        FROM ponder_live.proposals p
        LEFT JOIN ponder_live.ens_names e ON LOWER(p.proposer) = LOWER(e.address)
        LEFT JOIN ponder_live.candidates c
          ON p.encoded_proposal_hash IS NOT NULL
         AND c.encoded_proposal_hash = p.encoded_proposal_hash
        WHERE p.created_timestamp >= ${since}
        ORDER BY p.created_timestamp DESC
        LIMIT ${limit}
      `;

/**
 * Map an outcome bucket to its corresponding ActivityType. Centralized so
 * the outcome defs and the factory can't drift.
 */
const OUTCOME_TO_TYPE = {
  succeeded: 'proposal_succeeded',
  defeated: 'proposal_defeated',
  cancelled: 'proposal_cancelled',
  queued: 'proposal_queued',
  executed: 'proposal_executed',
} as const satisfies Record<ProposalOutcome, ActivityType>;

/**
 * Map an outcome to the `proposalStatus` field used in the emitted item.
 * Matches legacy behavior: cancelled defaults to 'defeated', queued and
 * executed both report 'succeeded'.
 */
const OUTCOME_TO_PROPOSAL_STATUS: Record<ProposalOutcome, 'succeeded' | 'defeated'> = {
  succeeded: 'succeeded',
  defeated: 'defeated',
  cancelled: 'defeated',
  queued: 'succeeded',
  executed: 'succeeded',
};

/**
 * Build the outcome ActivityItem for a single row. Stable id across
 * SUCCEEDED → QUEUED → EXECUTED transitions so React reuses the row.
 */
function buildOutcomeItem(
  row: ApiProposalRow,
  endTimestamp: string,
  outcome: ProposalOutcome,
): ActivityItem {
  // A cancellation's actor is whoever sent the cancel transaction — not
  // necessarily the proposer (a sponsor withdrawing their signature drops the
  // proposer below threshold and lets anyone cancel). Falls back to the
  // proposer until the indexer has backfilled cancelled_by.
  const cancelledBy = outcome === 'cancelled' ? row.cancelled_by : null;
  const actor = cancelledBy || row.proposer;

  return {
    id: `proposal-outcome-${row.id}`,
    type: OUTCOME_TO_TYPE[outcome],
    timestamp: endTimestamp,
    actor,
    // proposer_ens only describes the proposer — don't mislabel a canceller.
    actorEns: cancelledBy ? undefined : row.proposer_ens || undefined,
    proposalId: String(row.id),
    proposalTitle: row.title,
    proposalStatus: OUTCOME_TO_PROPOSAL_STATUS[outcome],
  };
}

/**
 * Factory: build the `processRows` for one outcome definition. Each of the 5
 * outcome defs calls this with its own bucket; the result filters the rows
 * to that bucket and emits one item per match.
 */
export function makeOutcomeProcessor(outcome: ProposalOutcome) {
  return (rows: ApiProposalRow[], ctx: ProcessContext): ActivityItem[] => {
    const items: ActivityItem[] = [];
    for (const row of rows) {
      const status = deriveProposalStatus(row, ctx.currentBlock);
      if (classifyOutcome(status) !== outcome) continue;
      items.push(buildOutcomeItem(row, status.endTimestamp, outcome));
    }
    return items;
  };
}
