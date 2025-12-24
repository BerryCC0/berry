/**
 * useVoters Hook
 * Fetches delegates/voters from Goldsky
 */

'use client';

import { useQuery } from '@tanstack/react-query';
import { GOLDSKY_ENDPOINT } from '@/app/lib/nouns/constants';
import type { Voter, VoterSort } from '../types';

const VOTERS_QUERY = `
  query Voters($first: Int!, $skip: Int!, $orderBy: String!, $orderDirection: String!) {
    delegates(
      first: $first
      skip: $skip
      orderBy: $orderBy
      orderDirection: $orderDirection
      where: { delegatedVotesRaw_gt: "0" }
    ) {
      id
      delegatedVotes
      tokenHoldersRepresentedAmount
      nounsRepresented {
        id
      }
    }
  }
`;

const VOTER_QUERY = `
  query Voter($id: ID!) {
    delegate(id: $id) {
      id
      delegatedVotes
      tokenHoldersRepresentedAmount
      nounsRepresented {
        id
      }
      votes(orderBy: blockTimestamp, orderDirection: desc, first: 50) {
        id
        proposal {
          id
          title
        }
        supportDetailed
        votes
        reason
        blockTimestamp
      }
    }
  }
`;

interface VotersQueryResult {
  delegates: Array<{
    id: string;
    delegatedVotes: string;
    tokenHoldersRepresentedAmount: number;
    nounsRepresented: { id: string }[];
  }>;
}

async function fetchVoters(
  first: number,
  skip: number,
  sort: VoterSort
): Promise<Voter[]> {
  const orderByMap: Record<VoterSort, string> = {
    votes: 'totalVotes',
    power: 'delegatedVotesRaw',
    represented: 'tokenHoldersRepresentedAmount',
  };

  const response = await fetch(GOLDSKY_ENDPOINT, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      query: VOTERS_QUERY,
      variables: {
        first,
        skip,
        orderBy: orderByMap[sort],
        orderDirection: 'desc',
      },
    }),
  });

  const json = await response.json();
  if (json.errors) throw new Error(json.errors[0].message);

  const data = json.data as VotersQueryResult;
  return data.delegates.map(d => ({
    ...d,
    votes: [],
  }));
}

async function fetchVoter(address: string): Promise<Voter & { recentVotes: any[] }> {
  const response = await fetch(GOLDSKY_ENDPOINT, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      query: VOTER_QUERY,
      variables: { id: address.toLowerCase() },
    }),
  });

  const json = await response.json();
  if (json.errors) throw new Error(json.errors[0].message);
  if (!json.data?.delegate) throw new Error('Voter not found');

  const d = json.data.delegate;
  return {
    ...d,
    votes: [],
    recentVotes: d.votes.map((v: any) => ({
      id: v.id,
      voter: d.id,
      proposalId: v.proposal.id,
      proposalTitle: v.proposal.title,
      support: v.supportDetailed,
      votes: v.votes,
      reason: v.reason,
      blockTimestamp: v.blockTimestamp,
    })),
  };
}

export function useVoters(first: number = 50, sort: VoterSort = 'power') {
  return useQuery({
    queryKey: ['camp', 'voters', first, sort],
    queryFn: () => fetchVoters(first, 0, sort),
    staleTime: 60000,
  });
}

export function useVoter(address: string | null) {
  return useQuery({
    queryKey: ['camp', 'voter', address],
    queryFn: () => fetchVoter(address!),
    enabled: !!address,
    staleTime: 30000,
  });
}

