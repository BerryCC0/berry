/**
 * Small Grants proposals — same shape as V2 proposals but reading voting power
 * from mainnet V1 NounsToken. Iterates `proposalCount` and multicalls.
 */

'use client';

import { useQuery } from '@tanstack/react-query';
import { usePublicClient } from 'wagmi';
import { SG_CONTRACTS } from '../contracts';
import type { V2ProposalState } from './useV2Proposals';

const STATE_NAMES: V2ProposalState[] = [
  'Active',
  'Canceled',
  'Defeated',
  'Succeeded',
  'Queued',
  'Expired',
  'Executed',
];

export interface SGProposal {
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
  title: string;
}

function extractTitle(description: string): string {
  const firstLine = description.split('\n').map((s) => s.trim()).find(Boolean) ?? '';
  return firstLine.replace(/^#+\s*/, '').slice(0, 140) || 'Grant';
}

export function useSGProposals() {
  const publicClient = usePublicClient({ chainId: 1 });

  return useQuery<SGProposal[]>({
    queryKey: ['sg', 'proposals'],
    enabled: !!publicClient,
    staleTime: 30_000,
    queryFn: async () => {
      if (!publicClient) return [];

      const count = (await publicClient.readContract({
        address: SG_CONTRACTS.treasury.address,
        abi: SG_CONTRACTS.treasury.abi,
        functionName: 'proposalCount',
      })) as bigint;

      if (count === BigInt(0)) return [];

      const ids = Array.from({ length: Number(count) }, (_, i) => BigInt(i + 1));

      const calls = ids.flatMap((id) => [
        {
          address: SG_CONTRACTS.treasury.address,
          abi: SG_CONTRACTS.treasury.abi,
          functionName: 'proposals' as const,
          args: [id] as const,
        },
        {
          address: SG_CONTRACTS.treasury.address,
          abi: SG_CONTRACTS.treasury.abi,
          functionName: 'state' as const,
          args: [id] as const,
        },
        {
          address: SG_CONTRACTS.treasury.address,
          abi: SG_CONTRACTS.treasury.abi,
          functionName: 'getDescription' as const,
          args: [id] as const,
        },
      ]);

      const results = await publicClient.multicall({ contracts: calls, allowFailure: true });

      const proposals: SGProposal[] = [];
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
