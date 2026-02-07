/**
 * useProposals Hook
 * Fetches proposals from Goldsky with on-chain status verification
 */

'use client';

import { useQuery } from '@tanstack/react-query';
import { GOLDSKY_ENDPOINT } from '@/app/lib/nouns/constants';
import { NOUNS_ADDRESSES } from '@/app/lib/nouns/contracts';
import type { Proposal, ProposalStatus, ProposalFilter, ProposalSort } from '../types';

// Ethereum mainnet RPC for getting current block and contract calls
const ETH_RPC = 'https://eth.llamarpc.com';

// Nouns DAO Governor proxy address
const NOUNS_DAO_PROXY = NOUNS_ADDRESSES.governor;

// state() function selector: keccak256("state(uint256)") = 0x3e4f49e6
const STATE_FUNCTION_SELECTOR = '0x3e4f49e6';

// ProposalState enum from contract
const PROPOSAL_STATE_MAP: Record<number, ProposalStatus> = {
  0: 'PENDING',
  1: 'ACTIVE',
  2: 'CANCELLED',
  3: 'DEFEATED',
  4: 'SUCCEEDED',
  5: 'QUEUED',
  6: 'EXPIRED',
  7: 'EXECUTED',
  8: 'VETOED',
  9: 'OBJECTION_PERIOD',
  10: 'UPDATABLE',
};

/**
 * Get the current Ethereum block number
 */
async function getCurrentBlock(): Promise<number> {
  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 2000); // 2 second timeout

    const response = await fetch(ETH_RPC, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        jsonrpc: '2.0',
        method: 'eth_blockNumber',
        params: [],
        id: 1,
      }),
      signal: controller.signal,
    });

    clearTimeout(timeout);

    const json = await response.json();
    const block = parseInt(json.result, 16);
    // Sanity check - block should be at least 20M as of 2024
    if (block > 20000000) {
      return block;
    }
    throw new Error('Invalid block number');
  } catch {
    // Fallback: estimate from timestamp (12 sec/block, genesis ~2015-07-30)
    return Math.floor((Date.now() / 1000 - 1438269988) / 12);
  }
}

/**
 * Get proposal state directly from the Nouns DAO contract
 * This is the authoritative source for proposal status
 */
async function getOnChainState(proposalId: string): Promise<ProposalStatus | null> {
  try {
    // Encode the call: state(uint256 proposalId)
    const paddedId = BigInt(proposalId).toString(16).padStart(64, '0');
    const callData = STATE_FUNCTION_SELECTOR + paddedId;

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 3000); // 3 second timeout

    const response = await fetch(ETH_RPC, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        jsonrpc: '2.0',
        method: 'eth_call',
        params: [{ to: NOUNS_DAO_PROXY, data: callData }, 'latest'],
        id: 1,
      }),
      signal: controller.signal,
    });

    clearTimeout(timeout);

    const json = await response.json();
    if (json.result && json.result !== '0x') {
      const stateValue = parseInt(json.result, 16);
      if (!isNaN(stateValue) && PROPOSAL_STATE_MAP[stateValue]) {
        return PROPOSAL_STATE_MAP[stateValue];
      }
    }
    return null;
  } catch {
    return null;
  }
}

/**
 * Batch get proposal states from the contract
 */
async function getOnChainStates(proposalIds: string[]): Promise<Map<string, ProposalStatus>> {
  const results = new Map<string, ProposalStatus>();
  
  // Batch calls using Promise.all (limit concurrency)
  const batchSize = 10;
  for (let i = 0; i < proposalIds.length; i += batchSize) {
    const batch = proposalIds.slice(i, i + batchSize);
    const states = await Promise.all(batch.map(id => getOnChainState(id)));
    batch.forEach((id, idx) => {
      if (states[idx]) {
        results.set(id, states[idx]!);
      }
    });
  }
  
  return results;
}

/**
 * Calculate status as fallback when contract call fails
 * Uses block numbers to determine status
 */
function calculateStatusFallback(
  goldskyStatus: string,
  startBlock: string,
  endBlock: string,
  forVotes: string,
  againstVotes: string,
  quorumVotes: string,
  currentBlock: number
): ProposalStatus {
  const status = goldskyStatus as ProposalStatus;
  const start = Number(startBlock);
  const end = Number(endBlock);
  
  // Final states are always trusted
  if (['EXECUTED', 'CANCELLED', 'VETOED', 'EXPIRED', 'QUEUED'].includes(status)) {
    return status;
  }
  
  // If Goldsky says ACTIVE, trust it (it's been indexed from chain events)
  if (status === 'ACTIVE' || status === 'OBJECTION_PERIOD') {
    return status;
  }
  
  // If we don't have a valid current block, trust Goldsky
  if (currentBlock <= 0 || currentBlock < start) {
    // If Goldsky says PENDING but we have votes, something is off - trust Goldsky
    if (status === 'PENDING' || status === 'UPDATABLE') {
      return status;
    }
  }
  
  // Calculate based on block numbers only if we have valid data
  if (currentBlock > 0) {
    if (currentBlock < start) {
      return 'PENDING';
    }
    
    if (currentBlock >= start && currentBlock <= end) {
      return 'ACTIVE';
    }
    
    // After voting ended
    if (currentBlock > end) {
      const forVotesNum = Number(forVotes);
      const againstVotesNum = Number(againstVotes);
      const quorumNum = Number(quorumVotes);
      
      if (forVotesNum < quorumNum || againstVotesNum > forVotesNum) {
        return 'DEFEATED';
      }
      
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
      signers {
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
      updatePeriodEndBlock
      totalSupply
      clientId
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
  
  // Only fetch on-chain state for proposals where Goldsky might be stale
  // Skip for: final states, ACTIVE (Goldsky is reliable for this)
  const proposalIds = data.proposals
    .filter(p => !['EXECUTED', 'CANCELLED', 'VETOED', 'EXPIRED', 'ACTIVE', 'OBJECTION_PERIOD', 'QUEUED'].includes(p.status))
    .map(p => p.id);
  
  // Only make on-chain calls if we have proposals that need verification
  const onChainStates = proposalIds.length > 0 
    ? await getOnChainStates(proposalIds.slice(0, 5)) // Limit to 5 to keep it fast
    : new Map<string, ProposalStatus>();
  
  let proposals = data.proposals.map(p => {
    // Use on-chain state if available, otherwise use Goldsky + fallback calculation
    const onChainStatus = onChainStates.get(p.id);
    const status = onChainStatus || calculateStatusFallback(
      p.status,
      p.startBlock,
      p.endBlock,
      p.forVotes,
      p.againstVotes,
      p.quorumVotes,
      currentBlock
    );
    
    return {
      ...p,
      proposer: p.proposer.id,
      status,
    };
  });

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
  // Fetch proposal, current block, and on-chain state in parallel
  const [proposalResponse, currentBlock, onChainStatus] = await Promise.all([
    fetch(GOLDSKY_ENDPOINT, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        query: PROPOSAL_QUERY,
        variables: { id },
      }),
    }),
    getCurrentBlock(),
    getOnChainState(id),
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
  
  // Determine status: prefer on-chain state, but sanity check against Goldsky
  let status: ProposalStatus;
  
  if (onChainStatus) {
    // Sanity check: if Goldsky says ACTIVE but on-chain says something final,
    // verify against block numbers before trusting
    const goldskyIsActive = p.status === 'ACTIVE' || p.status === 'OBJECTION_PERIOD';
    const onChainIsFinal = ['SUCCEEDED', 'DEFEATED', 'EXPIRED'].includes(onChainStatus);
    
    if (goldskyIsActive && onChainIsFinal && currentBlock <= Number(p.endBlock)) {
      // Voting hasn't ended yet, trust Goldsky's ACTIVE status
      status = p.status as ProposalStatus;
    } else {
      status = onChainStatus;
    }
  } else {
    status = calculateStatusFallback(
      p.status,
      p.startBlock,
      p.endBlock,
      p.forVotes,
      p.againstVotes,
      p.quorumVotes,
      currentBlock
    );
  }
  
  return {
    ...p,
    proposer: p.proposer.id,
    status,
    actions,
    clientId: p.clientId ?? undefined,
    signers: (p.signers || []).map((s: { id: string }) => s.id),
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
    staleTime: 10000, // 10 seconds - keep fresh
    refetchOnMount: 'always', // Always refetch when component mounts
  });
}

