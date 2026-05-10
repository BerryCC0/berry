/**
 * V2 governance proposal list. Iterates `proposalCount` and multicalls
 * `proposals(i)`, `state(i)`, `getDescription(i)` for each.
 *
 * Once the Ponder indexer catches up, swap this for a single API call
 * to /api/nouns-v2/proposals.
 */

'use client';

import { useQuery } from '@tanstack/react-query';
import { usePublicClient } from 'wagmi';
import { V2_CONTRACTS, V2_CHAIN_ID } from '../contracts';

/** Mirrors NounV2Treasury.ProposalState — keep in sync with the enum. */
export type V2ProposalState =
  | 'Active'
  | 'Canceled'
  | 'Defeated'
  | 'Succeeded'
  | 'Queued'
  | 'Expired'
  | 'Executed';

const STATE_NAMES: V2ProposalState[] = [
  'Active',
  'Canceled',
  'Defeated',
  'Succeeded',
  'Queued',
  'Expired',
  'Executed',
];

export interface V2Proposal {
  id: bigint;
  proposer: `0x${string}`;
  snapshotBlock: bigint;
  startBlock: bigint;
  endBlock: bigint;
  eta: bigint;
  forVotes: bigint;
  againstVotes: bigint;
  abstainVotes: bigint;
  canceled: boolean;
  executed: boolean;
  queued: boolean;
  state: V2ProposalState;
  description: string;
  /** First non-empty line of the description, used as a list title. */
  title: string;
}

function extractTitle(description: string): string {
  const firstLine = description.split('\n').map((s) => s.trim()).find(Boolean) ?? '';
  return firstLine.replace(/^#+\s*/, '').slice(0, 140) || `Proposal`;
}

export function useV2Proposals() {
  const publicClient = usePublicClient({ chainId: V2_CHAIN_ID });

  return useQuery<V2Proposal[]>({
    queryKey: ['v2', 'proposals'],
    enabled: !!publicClient,
    staleTime: 30_000,
    queryFn: async () => {
      if (!publicClient) return [];

      const count = (await publicClient.readContract({
        address: V2_CONTRACTS.treasury.address,
        abi: V2_CONTRACTS.treasury.abi,
        functionName: 'proposalCount',
      })) as bigint;

      if (count === BigInt(0)) return [];

      const ids = Array.from({ length: Number(count) }, (_, i) => BigInt(i + 1));

      const calls = ids.flatMap((id) => [
        {
          address: V2_CONTRACTS.treasury.address,
          abi: V2_CONTRACTS.treasury.abi,
          functionName: 'proposals' as const,
          args: [id] as const,
        },
        {
          address: V2_CONTRACTS.treasury.address,
          abi: V2_CONTRACTS.treasury.abi,
          functionName: 'state' as const,
          args: [id] as const,
        },
        {
          address: V2_CONTRACTS.treasury.address,
          abi: V2_CONTRACTS.treasury.abi,
          functionName: 'getDescription' as const,
          args: [id] as const,
        },
      ]);

      const results = await publicClient.multicall({ contracts: calls, allowFailure: true });

      const proposals: V2Proposal[] = [];
      for (let i = 0; i < ids.length; i++) {
        const propRes = results[i * 3];
        const stateRes = results[i * 3 + 1];
        const descRes = results[i * 3 + 2];
        if (propRes.status !== 'success' || stateRes.status !== 'success') continue;

        const p = propRes.result as readonly [
          `0x${string}`, bigint, bigint, bigint, bigint, bigint, bigint, bigint, boolean, boolean, boolean,
        ];
        const stateIdx = Number(stateRes.result as number);
        const description = descRes.status === 'success' ? (descRes.result as string) : '';

        proposals.push({
          id: ids[i],
          proposer: p[0],
          snapshotBlock: p[1],
          startBlock: p[2],
          endBlock: p[3],
          eta: p[4],
          forVotes: p[5],
          againstVotes: p[6],
          abstainVotes: p[7],
          canceled: p[8],
          executed: p[9],
          queued: p[10],
          state: STATE_NAMES[stateIdx] ?? 'Active',
          description,
          title: extractTitle(description),
        });
      }

      return proposals.reverse();
    },
  });
}
