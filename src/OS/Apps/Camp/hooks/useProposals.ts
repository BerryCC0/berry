/**
 * useProposals Hook
 * Fetches proposals from Ponder API with on-chain status verification
 */

'use client';

import { useQuery } from '@tanstack/react-query';
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

// Module-level cache for getCurrentBlock() to avoid redundant RPC calls
let cachedBlock: { value: number; timestamp: number } | null = null;
const BLOCK_CACHE_TTL = 10_000; // 10 seconds

/**
 * Get the current Ethereum block number (cached for 10s)
 */
async function getCurrentBlock(): Promise<number> {
  if (cachedBlock && Date.now() - cachedBlock.timestamp < BLOCK_CACHE_TTL) {
    return cachedBlock.value;
  }

  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 2000);

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
    if (block > 20000000) {
      cachedBlock = { value: block, timestamp: Date.now() };
      return block;
    }
    throw new Error('Invalid block number');
  } catch {
    const fallback = Math.floor((Date.now() / 1000 - 1438269988) / 12);
    cachedBlock = { value: fallback, timestamp: Date.now() };
    return fallback;
  }
}

/**
 * Get proposal state directly from the Nouns DAO contract
 */
async function getOnChainState(proposalId: string): Promise<ProposalStatus | null> {
  try {
    const paddedId = BigInt(proposalId).toString(16).padStart(64, '0');
    const callData = STATE_FUNCTION_SELECTOR + paddedId;

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 3000);

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
 * Calculate status as fallback when contract call fails
 */
function calculateStatusFallback(
  indexedStatus: string,
  startBlock: string,
  endBlock: string,
  forVotes: string,
  againstVotes: string,
  quorumVotes: string,
  currentBlock: number
): ProposalStatus {
  const status = indexedStatus as ProposalStatus;
  const start = Number(startBlock);
  const end = Number(endBlock);

  // Final states are always trusted
  if (['EXECUTED', 'CANCELLED', 'VETOED', 'EXPIRED', 'QUEUED'].includes(status)) {
    return status;
  }

  if (status === 'ACTIVE' || status === 'OBJECTION_PERIOD') {
    return status;
  }

  if (currentBlock <= 0 || currentBlock < start) {
    if (status === 'PENDING' || status === 'UPDATABLE') {
      return status;
    }
  }

  if (currentBlock > 0) {
    if (currentBlock < start) {
      return 'PENDING';
    }

    if (currentBlock >= start && currentBlock <= end) {
      return 'ACTIVE';
    }

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

// ============================================================================
// API RESPONSE MAPPING
// ============================================================================

/**
 * Map a proposal row from our API (snake_case) to the Proposal type (camelCase)
 */
function mapProposal(p: any): Proposal {
  return {
    id: String(p.id),
    title: p.title || '',
    description: p.description || '',
    status: p.status as ProposalStatus,
    proposer: p.proposer || '',
    forVotes: String(p.for_votes ?? '0'),
    againstVotes: String(p.against_votes ?? '0'),
    abstainVotes: String(p.abstain_votes ?? '0'),
    quorumVotes: String(p.quorum_votes ?? '0'),
    startBlock: String(p.start_block ?? '0'),
    endBlock: String(p.end_block ?? '0'),
    createdTimestamp: String(p.created_timestamp ?? '0'),
    createdBlock: String(p.created_block ?? '0'),
    executionETA: p.execution_eta ? String(p.execution_eta) : undefined,
    totalSupply: p.total_supply ? String(p.total_supply) : undefined,
    clientId: p.client_id ?? undefined,
    signers: p.signers || [],
    updatePeriodEndBlock: p.update_period_end_block ? String(p.update_period_end_block) : undefined,
    actions: p.targets?.map((target: string, i: number) => ({
      target,
      value: p.values?.[i] || '0',
      signature: p.signatures?.[i] || '',
      calldata: p.calldatas?.[i] || '0x',
    })) || undefined,
  };
}

// ============================================================================
// FETCH FUNCTIONS
// ============================================================================

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
  clientId?: number;
  blockTimestamp: string;
}

async function fetchProposals(
  first: number,
  skip: number,
  filter: ProposalFilter,
  sort: ProposalSort
): Promise<Proposal[]> {
  const params = new URLSearchParams({
    limit: String(first),
    offset: String(skip),
    sort,
  });
  if (filter !== 'all') params.set('filter', filter);

  // Fetch proposals and current block in parallel
  const [response, currentBlock] = await Promise.all([
    fetch(`/api/proposals?${params}`),
    getCurrentBlock(),
  ]);

  if (!response.ok) throw new Error('Failed to fetch proposals');

  const json = await response.json();
  return (json.proposals || []).map((p: any) => {
    const mapped = mapProposal(p);
    // Compute real-time status from block data (PENDING->ACTIVE, ACTIVE->DEFEATED/SUCCEEDED)
    mapped.status = calculateStatusFallback(
      mapped.status,
      mapped.startBlock,
      mapped.endBlock,
      mapped.forVotes,
      mapped.againstVotes,
      mapped.quorumVotes,
      currentBlock
    );
    return mapped;
  });
}

async function fetchProposal(id: string): Promise<Proposal & { votes: ProposalVote[]; feedback: ProposalFeedback[] }> {
  // Fetch proposal from API, current block, and on-chain state in parallel
  const [apiResponse, currentBlock, onChainStatus] = await Promise.all([
    fetch(`/api/proposals/${id}`),
    getCurrentBlock(),
    getOnChainState(id),
  ]);

  if (!apiResponse.ok) throw new Error('Failed to fetch proposal');
  const json = await apiResponse.json();
  if (!json.proposal) throw new Error('Proposal not found');

  const p = json.proposal;
  const proposal = mapProposal(p);

  // Determine status: prefer on-chain state for real-time accuracy
  let status: ProposalStatus;

  if (onChainStatus) {
    const indexedIsActive = proposal.status === 'ACTIVE' || proposal.status === 'OBJECTION_PERIOD';
    const onChainIsFinal = ['SUCCEEDED', 'DEFEATED', 'EXPIRED'].includes(onChainStatus);

    if (indexedIsActive && onChainIsFinal && currentBlock <= Number(proposal.endBlock)) {
      status = proposal.status;
    } else {
      status = onChainStatus;
    }
  } else {
    status = calculateStatusFallback(
      proposal.status,
      proposal.startBlock,
      proposal.endBlock,
      proposal.forVotes,
      proposal.againstVotes,
      proposal.quorumVotes,
      currentBlock
    );
  }

  return {
    ...proposal,
    status,
    votes: (p.votes || []).map((v: any) => ({
      id: v.id,
      voter: v.voter,
      proposalId: String(v.proposal_id ?? id),
      support: v.support,
      votes: String(v.votes),
      reason: v.reason,
      clientId: v.client_id ?? undefined,
      blockTimestamp: String(v.block_timestamp),
    })),
    feedback: (p.feedback || []).map((f: any) => ({
      id: f.id,
      voter: f.msg_sender,
      support: f.support,
      votes: String(f.votes ?? '0'),
      reason: f.reason,
      createdTimestamp: String(f.block_timestamp),
    })),
  };
}

// ============================================================================
// HOOKS
// ============================================================================

export function useProposals(
  first: number = 20,
  filter: ProposalFilter = 'all',
  sort: ProposalSort = 'newest'
) {
  return useQuery({
    queryKey: ['camp', 'proposals', first, filter, sort],
    queryFn: () => fetchProposals(first, 0, filter, sort),
    staleTime: 60000,
  });
}

export function useProposal(id: string | null) {
  return useQuery({
    queryKey: ['camp', 'proposal', id],
    queryFn: () => fetchProposal(id!),
    enabled: !!id,
    staleTime: 10000,
    refetchOnMount: 'always',
  });
}
