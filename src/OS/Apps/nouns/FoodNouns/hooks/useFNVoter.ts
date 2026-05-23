/**
 * Full Food Nouns voter detail — represented Nouns (with SVG), voting power,
 * delegation info (delegatingTo + delegators), vote history with reasons and
 * proposal titles, and proposals authored. Backed by /api/food-nouns/voter.
 */

'use client';

import { useQuery } from '@tanstack/react-query';

export interface FNVoterRepresentedNoun {
  id: number;
  svg: string;
  /** Current on-chain owner. May equal the profile address (self-delegated)
   *  or differ (this Noun is being delegated TO the profile from someone). */
  owner: `0x${string}`;
}

export interface FNVoterVote {
  proposalId: number;
  proposalTitle: string | null;
  support: number;
  votes: bigint;
  reason: string;
  blockNumber: bigint;
  timestamp: number;
  txHash: `0x${string}`;
}

export interface FNVoterProposal {
  id: number;
  title: string | null;
  state: string | null;
  createdTimestamp: number;
  forVotes: bigint;
  againstVotes: bigint;
  abstainVotes: bigint;
}

export interface FNVoterDetail {
  address: `0x${string}`;
  owned: number;
  delegatedVotes: number;
  totalVotes: number;
  firstSeenAt: number | null;
  lastVoteAt: number | null;
  /** Nouns whose voting power is currently delegated to this address. */
  nouns: FNVoterRepresentedNoun[];
  /** Address this voter currently delegates to (null if never delegated). */
  delegatingTo: `0x${string}` | null;
  /** Unique addresses currently delegating TO this voter (excluding self). */
  delegators: `0x${string}`[];
  votes: FNVoterVote[];
  proposals: FNVoterProposal[];
}

interface ApiResponse {
  address: string;
  owned: number;
  delegatedVotes: number;
  totalVotes: number;
  firstSeenAt: string | null;
  lastVoteAt: string | null;
  nouns: { id: number; svg: string; owner: string }[];
  delegatingTo: string | null;
  delegators: string[];
  votes: {
    proposalId: number;
    proposalTitle: string | null;
    support: number;
    votes: string;
    reason: string;
    blockNumber: string;
    timestamp: string;
    txHash: string;
  }[];
  proposals: {
    id: number;
    title: string | null;
    state: string | null;
    createdTimestamp: string;
    forVotes: string;
    againstVotes: string;
    abstainVotes: string;
  }[];
  error?: string;
}

export function useFNVoter(address: `0x${string}` | null) {
  return useQuery<FNVoterDetail | null>({
    queryKey: ['fn', 'voter', address ?? null],
    enabled: !!address,
    staleTime: 30_000,
    queryFn: async () => {
      if (!address) return null;
      const res = await fetch(`/api/food-nouns/voter?address=${address}`);
      if (!res.ok) throw new Error(`Voter fetch failed: ${res.status}`);
      const json = (await res.json()) as ApiResponse;
      if (json.error) throw new Error(json.error);
      return {
        address: json.address as `0x${string}`,
        owned: json.owned,
        delegatedVotes: json.delegatedVotes,
        totalVotes: json.totalVotes,
        firstSeenAt: json.firstSeenAt != null ? Number(json.firstSeenAt) : null,
        lastVoteAt: json.lastVoteAt != null ? Number(json.lastVoteAt) : null,
        nouns: json.nouns.map((n) => ({
          id: n.id,
          svg: n.svg,
          owner: n.owner as `0x${string}`,
        })),
        delegatingTo: json.delegatingTo
          ? (json.delegatingTo as `0x${string}`)
          : null,
        delegators: json.delegators.map((d) => d as `0x${string}`),
        votes: json.votes.map((v) => ({
          proposalId: v.proposalId,
          proposalTitle: v.proposalTitle,
          support: v.support,
          votes: BigInt(v.votes),
          reason: v.reason,
          blockNumber: BigInt(v.blockNumber),
          timestamp: Number(v.timestamp),
          txHash: v.txHash as `0x${string}`,
        })),
        proposals: json.proposals.map((p) => ({
          id: p.id,
          title: p.title,
          state: p.state,
          createdTimestamp: Number(p.createdTimestamp),
          forVotes: BigInt(p.forVotes),
          againstVotes: BigInt(p.againstVotes),
          abstainVotes: BigInt(p.abstainVotes),
        })),
      };
    },
  });
}
