/**
 * useProposals Hook
 * Fetches proposals from Goldsky
 */

'use client';

import { useQuery } from '@tanstack/react-query';
import { GOLDSKY_ENDPOINT } from '@/app/lib/nouns/constants';
import type { Proposal, ProposalStatus, ProposalFilter, ProposalSort } from '../types';

// Ethereum mainnet RPC for getting current block
const ETH_RPC = 'https://eth.llamarpc.com';

/**
 * Get the current Ethereum block number
 */
async function getCurrentBlock(): Promise<number> {
  try {
    const response = await fetch(ETH_RPC, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        jsonrpc: '2.0',
        method: 'eth_blockNumber',
        params: [],
        id: 1,
      }),
    });
    const json = await response.json();
    return parseInt(json.result, 16);
  } catch {
    // Fallback: estimate from timestamp (12 sec/block, genesis ~2015-07-30)
    return Math.floor((Date.now() / 1000 - 1438269988) / 12);
  }
}

/**
 * Calculate the correct proposal status
 * Goldsky doesn't properly return DEFEATED status, so we calculate it manually
 */
function calculateStatus(
  goldskyStatus: string,
  forVotes: string,
  againstVotes: string,
  quorumVotes: string,
  endBlock: string,
  currentBlock: number
): ProposalStatus {
  const status = goldskyStatus as ProposalStatus;
  
  // If already in a final state, trust it
  if (['EXECUTED', 'CANCELLED', 'VETOED', 'EXPIRED'].includes(status)) {
    return status;
  }
  
  // If voting has ended
  if (currentBlock > Number(endBlock)) {
    const forVotesNum = Number(forVotes);
    const againstVotesNum = Number(againstVotes);
    const quorumNum = Number(quorumVotes);
    
    // Defeated if: not enough For votes OR more Against than For
    if (forVotesNum < quorumNum || againstVotesNum > forVotesNum) {
      return 'DEFEATED';
    }
    
    // If it passed but hasn't been queued/executed yet
    if (status === 'ACTIVE' || status === 'OBJECTION_PERIOD') {
      return 'SUCCEEDED';
    }
  }
  
  return status;
}

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
      feedbackPosts(orderBy: createdTimestamp, orderDirection: desc, first: 100) {
        id
        voter {
          id
        }
        supportDetailed
        votes
        reason
        createdTimestamp
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

  // Fetch proposals and current block in parallel
  const [proposalsResponse, currentBlock] = await Promise.all([
    fetch(GOLDSKY_ENDPOINT, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        query: PROPOSALS_QUERY,
        variables: { first, skip, orderBy, orderDirection },
      }),
    }),
    getCurrentBlock(),
  ]);

  const json = await proposalsResponse.json();
  if (json.errors) throw new Error(json.errors[0].message);

  const data = json.data as ProposalQueryResult;
  
  let proposals = data.proposals.map(p => ({
    ...p,
    proposer: p.proposer.id,
    // Calculate correct status (Goldsky doesn't return DEFEATED properly)
    status: calculateStatus(
      p.status,
      p.forVotes,
      p.againstVotes,
      p.quorumVotes,
      p.endBlock,
      currentBlock
    ),
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

interface ProposalFeedback {
  id: string;
  voter: string;
  support: number;
  votes: string;
  reason: string | null;
  createdTimestamp: string;
}

interface ProposalVote {
  id: string;
  voter: string;
  proposalId: string;
  support: number;
  votes: string;
  reason: string | null;
  blockTimestamp: string;
}

async function fetchProposal(id: string): Promise<Proposal & { votes: ProposalVote[]; feedback: ProposalFeedback[] }> {
  // Fetch proposal and current block in parallel
  const [proposalResponse, currentBlock] = await Promise.all([
    fetch(GOLDSKY_ENDPOINT, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        query: PROPOSAL_QUERY,
        variables: { id },
      }),
    }),
    getCurrentBlock(),
  ]);

  const json = await proposalResponse.json();
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
    // Calculate correct status (Goldsky doesn't return DEFEATED properly)
    status: calculateStatus(
      p.status,
      p.forVotes,
      p.againstVotes,
      p.quorumVotes,
      p.endBlock,
      currentBlock
    ),
    actions,
    votes: (p.votes || []).map((v: any) => ({
      id: v.id,
      voter: v.voter.id,
      proposalId: id,
      support: v.supportDetailed,
      votes: v.votes,
      reason: v.reason,
      blockTimestamp: v.blockTimestamp,
    })),
    feedback: (p.feedbackPosts || []).map((f: any) => ({
      id: f.id,
      voter: f.voter.id,
      support: f.supportDetailed,
      votes: f.votes,
      reason: f.reason,
      createdTimestamp: f.createdTimestamp,
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

