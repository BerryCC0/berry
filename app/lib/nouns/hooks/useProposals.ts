/**
 * Proposals Hook
 * Fetch proposal data from Goldsky subgraph
 */

import { useNounsQuery } from './useNounsQuery';

// ============================================================================
// TYPES
// ============================================================================

export type ProposalStatus = 
  | 'PENDING'
  | 'ACTIVE'
  | 'CANCELLED'
  | 'VETOED'
  | 'QUEUED'
  | 'EXECUTED'
  | 'DEFEATED'
  | 'EXPIRED';

export interface ProposalListItem {
  id: string;
  title: string;
  status: ProposalStatus;
  proposer: {
    id: string;
  };
  forVotes: string;
  againstVotes: string;
  abstainVotes: string;
  startBlock: string;
  endBlock: string;
  createdTimestamp: string;
}

export interface Vote {
  voter: {
    id: string;
    delegatedVotes: string;
  };
  supportDetailed: number;
  votes: string;
  reason: string | null;
  blockTimestamp: string;
}

export interface ProposalDetail extends ProposalListItem {
  description: string;
  quorumVotes: string;
  executionETA: string | null;
  votes: Vote[];
  feedbackPosts: Array<{
    voter: { id: string };
    supportDetailed: number;
    votes: string;
    reason: string | null;
    createdTimestamp: string;
  }>;
}

// ============================================================================
// QUERIES
// ============================================================================

const PROPOSALS_LIST_QUERY = `
  query Proposals($first: Int!, $skip: Int!) {
    proposals(
      first: $first
      skip: $skip
      orderBy: createdBlock
      orderDirection: desc
    ) {
      id
      title
      status
      proposer {
        id
      }
      forVotes
      againstVotes
      abstainVotes
      startBlock
      endBlock
      createdTimestamp
    }
  }
`;

const PROPOSAL_DETAIL_QUERY = `
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
      executionETA
      createdTimestamp
      votes(orderBy: blockTimestamp, orderDirection: desc) {
        voter {
          id
          delegatedVotes
        }
        supportDetailed
        votes
        reason
        blockTimestamp
      }
      feedbackPosts(orderBy: createdTimestamp, orderDirection: desc) {
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

const ACTIVE_PROPOSALS_QUERY = `
  query ActiveProposals {
    proposals(
      where: { status_in: [ACTIVE, PENDING] }
      orderBy: createdBlock
      orderDirection: desc
    ) {
      id
      title
      status
      proposer {
        id
      }
      forVotes
      againstVotes
      abstainVotes
      startBlock
      endBlock
      createdTimestamp
    }
  }
`;

// ============================================================================
// HOOKS
// ============================================================================

/**
 * Fetch paginated list of proposals
 */
export function useProposals(first: number = 20, skip: number = 0) {
  return useNounsQuery<{ proposals: ProposalListItem[] }>(
    ['proposals', String(first), String(skip)],
    PROPOSALS_LIST_QUERY,
    { first, skip },
    {
      staleTime: 60 * 1000, // 1 minute
    }
  );
}

/**
 * Fetch a single proposal with full details
 */
export function useProposal(id: string) {
  return useNounsQuery<{ proposal: ProposalDetail | null }>(
    ['proposal', id],
    PROPOSAL_DETAIL_QUERY,
    { id },
    {
      enabled: !!id,
      staleTime: 30 * 1000, // 30 seconds
    }
  );
}

/**
 * Fetch only active/pending proposals
 */
export function useActiveProposals() {
  return useNounsQuery<{ proposals: ProposalListItem[] }>(
    ['proposals', 'active'],
    ACTIVE_PROPOSALS_QUERY,
    undefined,
    {
      staleTime: 30 * 1000, // 30 seconds
      refetchInterval: 60 * 1000, // Refetch every minute
    }
  );
}

/**
 * Get vote support label
 */
export function getVoteSupportLabel(support: number): string {
  switch (support) {
    case 0:
      return 'Against';
    case 1:
      return 'For';
    case 2:
      return 'Abstain';
    default:
      return 'Unknown';
  }
}

/**
 * Get vote support color
 */
export function getVoteSupportColor(support: number): string {
  switch (support) {
    case 0:
      return '#ef4444'; // red
    case 1:
      return '#22c55e'; // green
    case 2:
      return '#6b7280'; // gray
    default:
      return '#6b7280';
  }
}

