/**
 * Activity definition: noun_delegation
 *
 * Source: extracted from `useActivityFeed.ts:550-568` (processDelegations) and
 * `app/api/activity/route.ts:138-156` (SQL). The conditional `nounId` vs
 * `nounIds` field selection is preserved — single-noun delegates get
 * `nounId` for the thumbnail, multi-noun delegates get `nounIds` for bulk
 * display.
 */

import type { ActivityDefinition } from '../types';
import type { ActivityItem } from '../../types';

interface ApiDelegationRow {
  id: string;
  delegator: string;
  delegator_ens: string | null;
  from_delegate: string;
  to_delegate: string;
  to_delegate_ens: string | null;
  block_timestamp: string;
  noun_ids: string | (string | number)[] | null;
}

export const delegationDefinition: ActivityDefinition<ApiDelegationRow> = {
  type: 'noun_delegation',
  producerKey: 'delegations',
  buildQuery: ({ sql, since, limit }) => sql`
        SELECT d.id, d.delegator, d.from_delegate, d.to_delegate, d.block_timestamp,
               COALESCE(
                 (SELECT json_agg(n.id ORDER BY n.id)
                  FROM ponder_live.nouns n
                  WHERE n.owner = d.delegator),
                 '[]'::json
               ) AS noun_ids,
               ed.name as delegator_ens,
               et.name as to_delegate_ens
        FROM ponder_live.delegations d
        LEFT JOIN ponder_live.ens_names ed ON LOWER(d.delegator) = LOWER(ed.address)
        LEFT JOIN ponder_live.ens_names et ON LOWER(d.to_delegate) = LOWER(et.address)
        WHERE d.block_timestamp >= ${since}
          AND d.from_delegate != d.to_delegate
        ORDER BY d.block_timestamp DESC
        LIMIT ${limit}
      `,
  processRows: (rows): ActivityItem[] =>
    rows.map((d) => {
      const nounIdList: (string | number)[] = Array.isArray(d.noun_ids) ? d.noun_ids : [];
      return {
        id: `delegation-${d.id}`,
        type: 'noun_delegation' as const,
        timestamp: String(d.block_timestamp),
        actor: d.delegator,
        actorEns: d.delegator_ens || undefined,
        fromAddress: d.from_delegate,
        toAddress: d.to_delegate,
        toAddressEns: d.to_delegate_ens || undefined,
        ...(nounIdList.length === 1 && { nounId: String(nounIdList[0]) }),
        ...(nounIdList.length > 1 && { nounIds: nounIdList.map(String) }),
      };
    }),
};
