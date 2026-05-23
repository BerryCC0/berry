/**
 * Single proposal detail: state, vote tallies, actions, and vote-cast feed.
 *
 * Reads `proposals(id)`, `state(id)`, `getActions(id)`, and the user's
 * `getReceipt(id, address)` from the chain. Description text and the
 * vote feed are pulled from the Etherscan-backed API routes.
 */

'use client';

import { useQuery } from '@tanstack/react-query';
import { useAccount, usePublicClient } from 'wagmi';
import { type Hex } from 'viem';
import { FN_CONTRACTS, FN_CHAIN_ID } from '../contracts';
import { fnProposalStateName, type FNProposalStateName } from '../abis/governorAbi';

export interface FNProposalAction {
  target: `0x${string}`;
  value: bigint;
  signature: string;
  calldata: Hex;
}

export interface FNVoteCast {
  voter: `0x${string}`;
  support: number;
  votes: bigint;
  reason: string;
  blockNumber: bigint;
  /** Unix seconds — actual block timestamp when the vote was cast. */
  timestamp: number;
  txHash: Hex;
}

export interface FNUserReceipt {
  hasVoted: boolean;
  support: number;
  votes: bigint;
}

export interface FNProposalDetail {
  id: bigint;
  proposer: `0x${string}`;
  description: string;
  state: FNProposalStateName | 'Unknown';
  rawState: number;
  proposalThreshold: bigint;
  quorumVotes: bigint;
  eta: bigint;
  startBlock: bigint;
  endBlock: bigint;
  forVotes: bigint;
  againstVotes: bigint;
  abstainVotes: bigint;
  canceled: boolean;
  vetoed: boolean;
  executed: boolean;
  actions: FNProposalAction[];
  votes: FNVoteCast[];
  userReceipt: FNUserReceipt | null;
}

interface ApiProposal {
  id: string;
  description: string;
}

interface ApiVote {
  voter: string;
  proposalId: string;
  support: number;
  votes: string;
  reason: string;
  blockNumber: string;
  timestamp?: string;
  txHash: string;
}

export function useFNProposal(proposalId: bigint | null) {
  const publicClient = usePublicClient({ chainId: FN_CHAIN_ID });
  const { address } = useAccount();

  return useQuery<FNProposalDetail | null>({
    queryKey: ['fn', 'proposal', proposalId?.toString() ?? null, address ?? null],
    enabled: !!publicClient && proposalId != null,
    staleTime: 15_000,
    queryFn: async () => {
      if (!publicClient || proposalId == null) return null;

      const [details, stateRaw, actionsRaw, receipt, descriptionRes, votesRes] = await Promise.all([
        publicClient.readContract({
          address: FN_CONTRACTS.governor.address,
          abi: FN_CONTRACTS.governor.abi,
          functionName: 'proposals',
          args: [proposalId],
        }),
        publicClient.readContract({
          address: FN_CONTRACTS.governor.address,
          abi: FN_CONTRACTS.governor.abi,
          functionName: 'state',
          args: [proposalId],
        }),
        publicClient.readContract({
          address: FN_CONTRACTS.governor.address,
          abi: FN_CONTRACTS.governor.abi,
          functionName: 'getActions',
          args: [proposalId],
        }),
        address
          ? publicClient
              .readContract({
                address: FN_CONTRACTS.governor.address,
                abi: FN_CONTRACTS.governor.abi,
                functionName: 'getReceipt',
                args: [proposalId, address],
              })
              .catch(() => null)
          : Promise.resolve(null),
        fetch('/api/food-nouns/proposals')
          .then((r) => (r.ok ? r.json() : Promise.reject(new Error(`proposals ${r.status}`))))
          .then((j: { proposals?: ApiProposal[] }) => j.proposals ?? [])
          .catch(() => [] as ApiProposal[]),
        fetch(`/api/food-nouns/votes?proposalId=${proposalId.toString()}`)
          .then((r) => (r.ok ? r.json() : Promise.reject(new Error(`votes ${r.status}`))))
          .then((j: { votes?: ApiVote[] }) => j.votes ?? [])
          .catch(() => [] as ApiVote[]),
      ]);

      const description =
        descriptionRes.find((p) => p.id === proposalId.toString())?.description ?? '';

      const actions: FNProposalAction[] = [];
      const targets = (actionsRaw[0] ?? []) as readonly `0x${string}`[];
      const values = (actionsRaw[1] ?? []) as readonly bigint[];
      const signatures = (actionsRaw[2] ?? []) as readonly string[];
      const calldatas = (actionsRaw[3] ?? []) as readonly Hex[];
      for (let i = 0; i < targets.length; i += 1) {
        actions.push({
          target: targets[i],
          value: values[i] ?? BigInt(0),
          signature: signatures[i] ?? '',
          calldata: calldatas[i] ?? ('0x' as Hex),
        });
      }

      const votes: FNVoteCast[] = votesRes.map((v) => ({
        voter: v.voter as `0x${string}`,
        support: v.support,
        votes: BigInt(v.votes),
        reason: v.reason,
        blockNumber: BigInt(v.blockNumber),
        timestamp: Number(v.timestamp ?? 0),
        txHash: v.txHash as Hex,
      }));

      const userReceipt: FNUserReceipt | null = receipt
        ? {
            hasVoted: (receipt as { hasVoted: boolean }).hasVoted,
            support: Number((receipt as { support: number }).support),
            votes: (receipt as { votes: bigint }).votes,
          }
        : null;

      return {
        id: proposalId,
        proposer: details[1],
        description,
        state: fnProposalStateName(stateRaw as number),
        rawState: Number(stateRaw),
        proposalThreshold: details[2],
        quorumVotes: details[3],
        eta: details[4],
        startBlock: details[5],
        endBlock: details[6],
        forVotes: details[7],
        againstVotes: details[8],
        abstainVotes: details[9],
        canceled: details[10],
        vetoed: details[11],
        executed: details[12],
        actions,
        votes,
        userReceipt,
      };
    },
  });
}
