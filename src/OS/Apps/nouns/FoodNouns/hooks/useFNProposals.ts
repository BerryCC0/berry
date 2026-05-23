/**
 * Lists Food Nouns proposals.
 *
 * Step 1: GET /api/food-nouns/proposals — Etherscan-backed log scan
 *         that returns id/proposer/description for every ProposalCreated.
 * Step 2: client-side multicall — state(id) + proposals(id) batched in
 *         a single RPC call to fetch live tallies.
 */

'use client';

import { useQuery } from '@tanstack/react-query';
import { usePublicClient } from 'wagmi';
import { FN_CONTRACTS, FN_CHAIN_ID } from '../contracts';
import { fnProposalStateName, type FNProposalStateName } from '../abis/governorAbi';

export interface FNProposalSummary {
  id: bigint;
  proposer: `0x${string}`;
  description: string;
  title: string;
  state: FNProposalStateName | 'Unknown';
  startBlock: bigint;
  endBlock: bigint;
  /** Block in which the proposal was submitted. */
  createdBlock: bigint;
  /** Unix seconds — actual block timestamp when the proposal was submitted. */
  createdTimestamp: number;
  forVotes: bigint;
  againstVotes: bigint;
  abstainVotes: bigint;
}

interface ApiProposal {
  id: string;
  proposer: string;
  description: string;
  startBlock: string;
  endBlock: string;
  blockNumber: string;
  timestamp: string;
  txHash: string;
}

function extractTitle(description: string): string {
  if (!description) return 'Untitled proposal';
  const firstLine = description.trim().split('\n')[0]?.trim() ?? '';
  return firstLine.replace(/^#+\s*/, '') || 'Untitled proposal';
}

export function useFNProposals() {
  const publicClient = usePublicClient({ chainId: FN_CHAIN_ID });

  return useQuery<FNProposalSummary[]>({
    queryKey: ['fn', 'proposals'],
    enabled: !!publicClient,
    staleTime: 30_000,
    queryFn: async () => {
      const res = await fetch('/api/food-nouns/proposals');
      if (!res.ok) throw new Error(`Proposals fetch failed: ${res.status}`);
      const json = (await res.json()) as { proposals?: ApiProposal[]; error?: string };
      if (json.error) throw new Error(json.error);
      const apiProposals = json.proposals ?? [];
      if (apiProposals.length === 0 || !publicClient) return [];

      // Multicall state(id) + proposals(id) for every entry — one RPC round trip.
      const contracts = apiProposals.flatMap((p) => {
        const id = BigInt(p.id);
        return [
          {
            address: FN_CONTRACTS.governor.address,
            abi: FN_CONTRACTS.governor.abi,
            functionName: 'state' as const,
            args: [id] as const,
          },
          {
            address: FN_CONTRACTS.governor.address,
            abi: FN_CONTRACTS.governor.abi,
            functionName: 'proposals' as const,
            args: [id] as const,
          },
        ];
      });

      const results = await publicClient.multicall({ contracts, allowFailure: true });

      return apiProposals.map((p, idx) => {
        const stateResult = results[idx * 2];
        const detailsResult = results[idx * 2 + 1];

        const stateName =
          stateResult.status === 'success'
            ? fnProposalStateName(stateResult.result as number)
            : ('Unknown' as const);

        let forVotes = BigInt(0);
        let againstVotes = BigInt(0);
        let abstainVotes = BigInt(0);
        if (detailsResult.status === 'success') {
          const details = detailsResult.result as readonly [
            bigint, `0x${string}`, bigint, bigint, bigint, bigint, bigint,
            bigint, bigint, bigint, boolean, boolean, boolean,
          ];
          forVotes = details[7];
          againstVotes = details[8];
          abstainVotes = details[9];
        }

        return {
          id: BigInt(p.id),
          proposer: p.proposer as `0x${string}`,
          description: p.description,
          title: extractTitle(p.description),
          state: stateName,
          startBlock: BigInt(p.startBlock),
          endBlock: BigInt(p.endBlock),
          createdBlock: BigInt(p.blockNumber),
          createdTimestamp: Number(p.timestamp ?? 0),
          forVotes,
          againstVotes,
          abstainVotes,
        } satisfies FNProposalSummary;
      });
    },
  });
}
