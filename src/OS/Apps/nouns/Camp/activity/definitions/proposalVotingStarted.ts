/**
 * Activity definition: proposal_voting_started
 *
 * **Empty producer.** No SQL is wired and `processRows` returns `[]`.
 *
 * Why this exists: the UI has rendering cases for this type
 * (`ProposalLifecycleContent.tsx:52` and `ActivityItem/index.tsx`'s switch),
 * but no processor ever emits items for it — voting start is detectable from
 * block-position derivation but was never surfaced as a feed item. Removing
 * the type entirely would churn the UI cases; emitting items here is out of
 * scope.
 *
 * The empty definition lets the `satisfies Record<ActivityType, …>` check
 * pass on the registry without forcing a producer query. If you ever decide
 * to ship this type, the migration path is:
 *   1. Add a definition that reads the proposals producer (share buildQuery
 *      — set producerKey: 'proposals', leave buildQuery omitted here).
 *   2. Implement processRows to emit when derivedStatus crosses pending → active.
 *   3. The stable-id strategy of proposal-outcome-${id} doesn't apply; use
 *      `proposal-voting-started-${id}` to be safe.
 */

import type { ActivityDefinition } from '../types';

export const proposalVotingStartedDefinition: ActivityDefinition<unknown> = {
  type: 'proposal_voting_started',
  producerKey: 'proposals',
  processRows: () => [],
};
