/**
 * useProposals Hook
 * Fetches proposals from Goldsky
 */

'use client';

import { useQuery } from '@tanstack/react-query';
import { GOLDSKY_ENDPOINT } from '@/app/lib/nouns/constants';
import type { Proposal, ProposalFilter, ProposalSort } from '../types';

const PROPOSALS_QUERY = `
  query Proposals($first: Int!, $skip: Int!, $orderBy: String!, $orderDirection: String!) {
    proposals(
      first: $first
      skip: $skip
      orderBy: $orderBy
      orderDirection: $orderDirection
    ) {
      id
      title
      description
      status
      proposer {
        id
      }
      forVotes
      againstVotes
      abstainVotes
      quorumVotes
      startBlock
      endBlock
      createdTimestamp
      createdBlock
      executionETA
      totalSupply
    }
  }
`;

const PROPOSAL_QUERY = `
  query Proposal($id: ID!) {
    proposal(id: $id) {
      id
      title
      description
      status
      proposer {
        id
      }
      forVotes
      againstVotes
      abstainVotes
      quorumVotes
      startBlock
      endBlock
      createdTimestamp
      createdBlock
      executionETA
      totalSupply
      targets
      values
      signatures
      calldatas
      votes(orderBy: votes, orderDirection: desc, first: 100) {
        id
        voter {
          id
        }
        supportDetailed
        votes
        reason
        blockTimestamp
      }
    }
  }
`;

interface ProposalQueryResult {
  proposals: Array<{
    id: string;
    title: string;
    description: string;
    status: string;
    proposer: { id: string };
    forVotes: string;
    againstVotes: string;
    abstainVotes: string;
    quorumVotes: string;
    startBlock: string;
    endBlock: string;
    createdTimestamp: string;
    createdBlock: string;
    executionETA?: string;
    totalSupply?: string;
  }>;
}

async function fetchProposals(
  first: number,
  skip: number,
  filter: ProposalFilter,
  sort: ProposalSort
): Promise<Proposal[]> {
  const orderBy = sort === 'ending_soon' ? 'endBlock' : 'createdBlock';
  const orderDirection = sort === 'oldest' ? 'asc' : 'desc';

  const response = await fetch(GOLDSKY_ENDPOINT, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      query: PROPOSALS_QUERY,
      variables: { first, skip, orderBy, orderDirection },
    }),
  });

  const json = await response.json();
  if (json.errors) throw new Error(json.errors[0].message);

  const data = json.data as ProposalQueryResult;
  
  let proposals = data.proposals.map(p => ({
    ...p,
    proposer: p.proposer.id,
    status: p.status as Proposal['status'],
  }));

  // Client-side filtering
  if (filter !== 'all') {
    const statusMap: Record<string, string[]> = {
      active: ['ACTIVE', 'OBJECTION_PERIOD'],
      pending: ['PENDING', 'UPDATABLE'],
      succeeded: ['SUCCEEDED', 'QUEUED'],
      defeated: ['DEFEATED', 'VETOED', 'CANCELLED'],
      executed: ['EXECUTED'],
    };
    const allowedStatuses = statusMap[filter] || [];
    proposals = proposals.filter(p => allowedStatuses.includes(p.status));
  }

  return proposals;
}

async function fetchProposal(id: string): Promise<Proposal & { votes: any[] }> {
  const response = await fetch(GOLDSKY_ENDPOINT, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      query: PROPOSAL_QUERY,
      variables: { id },
    }),
  });

  const json = await response.json();
  if (json.errors) throw new Error(json.errors[0].message);
  if (!json.data?.proposal) throw new Error('Proposal not found');

  const p = json.data.proposal;
  
  // Build actions array from parallel arrays
  const actions = p.targets?.map((target: string, i: number) => ({
    target,
    value: p.values?.[i] || '0',
    signature: p.signatures?.[i] || '',
    calldata: p.calldatas?.[i] || '0x',
  })) || [];
  
  return {
    ...p,
    proposer: p.proposer.id,
    status: p.status as Proposal['status'],
    actions,
    votes: p.votes.map((v: any) => ({
      id: v.id,
      voter: v.voter.id,
      proposalId: id,
      support: v.supportDetailed,
      votes: v.votes,
      reason: v.reason,
      blockTimestamp: v.blockTimestamp,
    })),
  };
}

export function useProposals(
  first: number = 20,
  filter: ProposalFilter = 'all',
  sort: ProposalSort = 'newest'
) {
  return useQuery({
    queryKey: ['camp', 'proposals', first, filter, sort],
    queryFn: () => fetchProposals(first, 0, filter, sort),
    staleTime: 60000, // 1 minute
  });
}

export function useProposal(id: string | null) {
  return useQuery({
    queryKey: ['camp', 'proposal', id],
    queryFn: () => fetchProposal(id!),
    enabled: !!id,
    staleTime: 30000,
  });
}

