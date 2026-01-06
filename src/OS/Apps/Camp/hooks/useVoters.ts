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
      tokenHoldersRepresented(first: 20) {
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
    account(id: $id) {
      id
      tokenBalance
      nouns {
        id
        seed {
          background
          body
          accessory
          head
          glasses
        }
      }
      delegate {
        id
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

interface NounWithSeed {
  id: string;
  seed?: {
    background: number;
    body: number;
    accessory: number;
    head: number;
    glasses: number;
  };
}

interface VoterResult extends Voter {
  recentVotes: any[];
  nounsOwned: NounWithSeed[];
  delegatingTo: string | null; // Address this account is delegating to
  delegators: string[]; // Addresses delegating to this account
}

async function fetchVoter(address: string): Promise<VoterResult> {
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
  
  // Handle case where delegate doesn't exist (user has never voted/delegated)
  const d = json.data?.delegate;
  const account = json.data?.account;
  
  // If neither delegate nor account exists, throw error
  if (!d && !account) throw new Error('Voter not found');
  
  // Get owned Nouns from account entity (with seeds for images)
  const nounsOwned: NounWithSeed[] = account?.nouns || [];
  
  // Get who this account is delegating to
  const delegatingTo = account?.delegate?.id || null;
  
  // Get who is delegating to this account
  const delegators: string[] = (d?.tokenHoldersRepresented || []).map((h: { id: string }) => h.id);
  
  return {
    id: d?.id || address.toLowerCase(),
    delegatedVotes: d?.delegatedVotes || '0',
    tokenHoldersRepresentedAmount: d?.tokenHoldersRepresentedAmount || 0,
    nounsRepresented: d?.nounsRepresented || [],
    votes: [],
    recentVotes: (d?.votes || []).map((v: any) => ({
      id: v.id,
      voter: d?.id || address.toLowerCase(),
      proposalId: v.proposal.id,
      proposalTitle: v.proposal.title,
      support: v.supportDetailed,
      votes: v.votes,
      reason: v.reason,
      blockTimestamp: v.blockTimestamp,
    })),
    nounsOwned,
    delegatingTo,
    delegators,
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

