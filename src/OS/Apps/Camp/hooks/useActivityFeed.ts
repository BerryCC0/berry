/**
 * useActivityFeed Hook
 * Fetches unified activity feed from Goldsky using parallel queries
 * 
 * Split into focused queries that run in parallel for better performance:
 * - Core: votes, proposals, feedback
 * - Candidates: creation, updates, signatures, feedback
 * - Nouns: transfers, delegations, auctions
 */

'use client';

import { useMemo } from 'react';
import { useQueries } from '@tanstack/react-query';
import { useBlockNumber } from 'wagmi';
import { GOLDSKY_ENDPOINT } from '@/app/lib/nouns/constants';
import type { ActivityItem } from '../types';

// ============================================================================
// FOCUSED QUERIES - Split for parallel execution
// ============================================================================

const CORE_QUERY = `
  query CoreActivity($first: Int!, $sinceTimestamp: BigInt!) {
    votes(
      first: $first
      orderBy: blockTimestamp
      orderDirection: desc
      where: { blockTimestamp_gte: $sinceTimestamp }
    ) {
      id
      voter { id }
      proposal { id, title }
      supportDetailed
      votes
      reason
      blockTimestamp
    }
    
    proposalFeedbacks(
      first: $first
      orderBy: createdTimestamp
      orderDirection: desc
      where: { createdTimestamp_gte: $sinceTimestamp }
    ) {
      id
      voter { id }
      proposal { id, title }
      supportDetailed
      reason
      createdTimestamp
    }
    
    proposals(
      first: $first
      orderBy: createdTimestamp
      orderDirection: desc
      where: { createdTimestamp_gte: $sinceTimestamp }
    ) {
      id
      title
      proposer { id }
      createdTimestamp
      startBlock
      endBlock
      status
      forVotes
      againstVotes
      quorumVotes
    }
  }
`;
    
const CANDIDATES_QUERY = `
  query CandidatesActivity($first: Int!, $sinceTimestamp: BigInt!) {
    proposalCandidates(
      first: $first
      orderBy: createdTimestamp
      orderDirection: desc
      where: { canceled: false, createdTimestamp_gte: $sinceTimestamp }
    ) {
      id
      proposer
      slug
      createdTimestamp
      latestVersion {
        content { title }
      }
    }
    
    candidateFeedbacks(
      first: $first
      orderBy: createdTimestamp
      orderDirection: desc
      where: { createdTimestamp_gte: $sinceTimestamp }
    ) {
      id
      voter { id }
      candidate {
        id
        slug
        proposer
        latestVersion {
          content { title }
        }
      }
      supportDetailed
      votes
      reason
      createdTimestamp
    }
    
    proposalCandidateSignatures(
      first: $first
      orderBy: createdTimestamp
      orderDirection: desc
      where: { canceled: false, createdTimestamp_gte: $sinceTimestamp }
    ) {
      id
      signer { id }
      content {
        id
        proposalIdToUpdate
        proposer
        title
      }
      reason
      canceled
      createdTimestamp
    }
    
    proposalCandidateVersions(
      first: $first
      orderBy: createdTimestamp
      orderDirection: desc
      where: { createdTimestamp_gte: $sinceTimestamp }
    ) {
      id
      proposal {
        id
        slug
        proposer
      }
      createdTimestamp
      updateMessage
      content { title }
    }
  }
`;

const NOUNS_QUERY = `
  query NounsActivity($first: Int!, $sinceTimestamp: BigInt!) {
    transferEvents(
      first: $first
      orderBy: blockTimestamp
      orderDirection: desc
      where: { blockTimestamp_gte: $sinceTimestamp }
    ) {
      id
      noun { id }
      previousHolder { id }
      newHolder { id }
      blockTimestamp
    }
    
    delegationEvents(
      first: $first
      orderBy: blockTimestamp
      orderDirection: desc
      where: { blockTimestamp_gte: $sinceTimestamp }
    ) {
      id
      noun { id }
      delegator { id }
      previousDelegate { id }
      newDelegate { id }
      blockTimestamp
    }
    
    auctions(
      first: $first
      orderBy: startTime
      orderDirection: desc
      where: { startTime_gte: $sinceTimestamp }
    ) {
      id
      noun { id }
      amount
      bidder { id }
      settled
      startTime
      endTime
    }
  }
`;

const PROPOSAL_UPDATES_QUERY = `
  query ProposalUpdates($first: Int!, $sinceTimestamp: BigInt!) {
    proposalVersions(
      first: $first
      orderBy: createdAt
      orderDirection: desc
      where: { createdAt_gte: $sinceTimestamp }
    ) {
      id
      proposal {
        id
        title
        proposer { id }
      }
      title
      createdAt
      updateMessage
    }
  }
`;

// ============================================================================
// TYPE DEFINITIONS
// ============================================================================

interface CoreQueryResult {
  votes: Array<{
    id: string;
    voter: { id: string };
    proposal: { id: string; title: string };
    supportDetailed: number;
    votes: string;
    reason: string | null;
    blockTimestamp: string;
  }>;
  proposalFeedbacks: Array<{
    id: string;
    voter: { id: string };
    proposal: { id: string; title: string };
    supportDetailed: number;
    reason: string | null;
    createdTimestamp: string;
  }>;
  proposals: Array<{
    id: string;
    title: string;
    proposer: { id: string };
    createdTimestamp: string;
    startBlock: string;
    endBlock: string;
    status: string;
    forVotes: string;
    againstVotes: string;
    quorumVotes: string;
  }>;
}

interface CandidatesQueryResult {
  proposalCandidates: Array<{
    id: string;
    proposer: string;
    slug: string;
    createdTimestamp: string;
    latestVersion: { content: { title: string } } | null;
  }>;
  candidateFeedbacks: Array<{
    id: string;
    voter: { id: string };
    candidate: {
      id: string;
      slug: string;
      proposer: string;
      latestVersion: { content: { title: string } } | null;
    };
    supportDetailed: number;
    votes: string;
    reason: string | null;
    createdTimestamp: string;
  }>;
  proposalCandidateSignatures: Array<{
    id: string;
    signer: { id: string };
    content: {
      id: string;
      proposalIdToUpdate: string;
      proposer: string;
      title: string;
    };
    reason: string;
    canceled: boolean;
    createdTimestamp: string;
  }>;
  proposalCandidateVersions: Array<{
    id: string;
    proposal: { id: string; slug: string; proposer: string };
    createdTimestamp: string;
    updateMessage: string;
    content: { title: string };
  }>;
}

interface NounsQueryResult {
  transferEvents: Array<{
    id: string;
    noun: { id: string };
    previousHolder: { id: string };
    newHolder: { id: string };
    blockTimestamp: string;
  }>;
  delegationEvents: Array<{
    id: string;
    noun: { id: string };
    delegator: { id: string };
    previousDelegate: { id: string };
    newDelegate: { id: string };
    blockTimestamp: string;
  }>;
  auctions: Array<{
    id: string;
    noun: { id: string };
    amount: string;
    bidder: { id: string } | null;
    settled: boolean;
    startTime: string;
    endTime: string;
  }>;
}

interface ProposalUpdatesQueryResult {
  proposalVersions: Array<{
    id: string;
    proposal: { id: string; title: string; proposer: { id: string } };
      title: string;
    createdAt: string;
    updateMessage: string;
  }>;
}

// ============================================================================
// CONSTANTS
// ============================================================================

const AUCTION_HOUSE = '0x830bd73e4184cef73443c15111a1df14e495c706';
const NOUNS_DAO = '0x0bc3807ec262cb779b38d65b38158acc3bfede10';
const ZERO_ADDRESS = '0x0000000000000000000000000000000000000000';

// ============================================================================
// QUERY EXECUTION
// ============================================================================

async function executeQuery<T>(query: string, first: number, sinceTimestamp: string): Promise<T> {
  const response = await fetch(GOLDSKY_ENDPOINT, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      query,
      variables: { first, sinceTimestamp },
    }),
  });

  const json = await response.json();
  if (json.errors) throw new Error(json.errors[0].message);
  return json.data as T;
}

// ============================================================================
// DATA PROCESSING
// ============================================================================

function processCoreData(data: CoreQueryResult, currentBlock: number | undefined): ActivityItem[] {
  const items: ActivityItem[] = [];

  // Votes
  for (const vote of data.votes) {
    items.push({
      id: `vote-${vote.id}`,
      type: 'vote',
      timestamp: vote.blockTimestamp,
      actor: vote.voter.id,
      proposalId: vote.proposal.id,
      proposalTitle: vote.proposal.title,
      support: vote.supportDetailed,
      votes: vote.votes,
      reason: vote.reason || undefined,
    });
  }

  // Proposal feedbacks
  for (const feedback of data.proposalFeedbacks) {
    items.push({
      id: `feedback-${feedback.id}`,
      type: 'proposal_feedback',
      timestamp: feedback.createdTimestamp,
      actor: feedback.voter.id,
      proposalId: feedback.proposal.id,
      proposalTitle: feedback.proposal.title,
      support: feedback.supportDetailed,
      reason: feedback.reason || undefined,
    });
  }

  // Proposal creations - show active/pending proposals in the feed
  // Use the actual Ethereum block number for accurate status calculation
  for (const proposal of data.proposals) {
    const startBlock = Number(proposal.startBlock);
    const endBlock = Number(proposal.endBlock);
    const forVotes = BigInt(proposal.forVotes);
    const againstVotes = BigInt(proposal.againstVotes);
    const quorumVotes = BigInt(proposal.quorumVotes);
    
    let derivedStatus: 'active' | 'pending' | 'succeeded' | 'defeated' | undefined;
    
    // Use actual block number if available for accurate status
    if (currentBlock !== undefined) {
      if (currentBlock < startBlock) {
        derivedStatus = 'pending';
      } else if (currentBlock >= startBlock && currentBlock <= endBlock) {
        derivedStatus = 'active';
      } else {
        // Voting period is over - check results
        if (forVotes > againstVotes && forVotes >= quorumVotes) {
          derivedStatus = 'succeeded';
        } else {
          derivedStatus = 'defeated';
        }
      }
    } else {
      // Fallback: trust GraphQL status or use vote counts
      const graphqlStatus = proposal.status?.toUpperCase();
      
      if (graphqlStatus === 'PENDING') {
        derivedStatus = 'pending';
      } else if (graphqlStatus === 'ACTIVE') {
        derivedStatus = 'active';
      } else if (graphqlStatus === 'SUCCEEDED' || graphqlStatus === 'QUEUED' || graphqlStatus === 'EXECUTED') {
        derivedStatus = 'succeeded';
      } else if (graphqlStatus === 'DEFEATED' || graphqlStatus === 'VETOED' || graphqlStatus === 'CANCELLED' || graphqlStatus === 'EXPIRED') {
        derivedStatus = 'defeated';
      } else {
        // Last resort: check if there are votes
        const totalVotes = forVotes + againstVotes;
        if (totalVotes > BigInt(0)) {
          derivedStatus = forVotes > againstVotes && forVotes >= quorumVotes ? 'succeeded' : 'defeated';
        } else {
          derivedStatus = 'pending';
        }
      }
    }
    
    // Only show active or pending proposals in activity feed
    if (derivedStatus === 'active' || derivedStatus === 'pending') {
      items.push({
        id: `proposal-created-${proposal.id}`,
        type: 'proposal_created',
        timestamp: proposal.createdTimestamp,
        actor: proposal.proposer.id,
        proposalId: proposal.id,
        proposalTitle: proposal.title,
        proposalStatus: derivedStatus,
      });
    }
  }

  return items;
}

function processCandidatesData(data: CandidatesQueryResult): ActivityItem[] {
  const items: ActivityItem[] = [];

  // Candidate creations
  for (const candidate of data.proposalCandidates) {
    items.push({
      id: `candidate-created-${candidate.id}`,
      type: 'candidate_created',
      timestamp: candidate.createdTimestamp,
      actor: candidate.proposer,
      candidateSlug: candidate.slug,
      candidateTitle: candidate.latestVersion?.content?.title,
      candidateProposer: candidate.proposer,
    });
  }

  // Candidate feedbacks
  for (const feedback of data.candidateFeedbacks) {
    items.push({
      id: `candidate-feedback-${feedback.id}`,
      type: 'candidate_feedback',
      timestamp: feedback.createdTimestamp,
      actor: feedback.voter.id,
      candidateSlug: feedback.candidate.slug,
      candidateProposer: feedback.candidate.proposer,
      candidateTitle: feedback.candidate.latestVersion?.content?.title,
      support: feedback.supportDetailed,
      votes: feedback.votes,
      reason: feedback.reason || undefined,
    });
  }

  // Candidate sponsorships
  for (const signature of data.proposalCandidateSignatures) {
    if (signature.canceled) continue;
    items.push({
      id: `candidate-sponsored-${signature.id}`,
      type: 'candidate_sponsored',
      timestamp: signature.createdTimestamp,
      actor: signature.signer.id,
      candidateTitle: signature.content.title,
      candidateProposer: signature.content.proposer,
      reason: signature.reason || undefined,
      sponsorCanceled: signature.canceled,
    });
  }

  // Candidate updates
  const candidateFirstVersions = new Map<string, string>();
  for (const version of data.proposalCandidateVersions) {
    const candidateId = version.proposal.id;
    const existingTime = candidateFirstVersions.get(candidateId);
    if (!existingTime || version.createdTimestamp < existingTime) {
      candidateFirstVersions.set(candidateId, version.createdTimestamp);
    }
  }
  
  for (const version of data.proposalCandidateVersions) {
    const candidateId = version.proposal.id;
    const firstVersionTime = candidateFirstVersions.get(candidateId);
    if (version.createdTimestamp === firstVersionTime) continue;
    if (!version.updateMessage || version.updateMessage.trim() === '') continue;
    
    items.push({
      id: `candidate-updated-${version.id}`,
      type: 'candidate_updated',
      timestamp: version.createdTimestamp,
      actor: version.proposal.proposer,
      candidateSlug: version.proposal.slug,
      candidateProposer: version.proposal.proposer,
      candidateTitle: version.content.title,
      updateMessage: version.updateMessage,
    });
  }

  return items;
}

function processNounsData(data: NounsQueryResult): { items: ActivityItem[]; auctionStartedItems: ActivityItem[]; auctionSettledItems: ActivityItem[] } {
  const items: ActivityItem[] = [];
  const auctionStartedItems: ActivityItem[] = [];
  const auctionSettledItems: ActivityItem[] = [];

  // Build transfer keys for filtering
  const transferKeys = new Set<string>();
  for (const transfer of data.transferEvents) {
    transferKeys.add(`${transfer.noun.id}-${transfer.blockTimestamp}`);
  }

  // Transfers
  for (const transfer of data.transferEvents) {
    const from = transfer.previousHolder.id.toLowerCase();
    const to = transfer.newHolder.id.toLowerCase();
    
    if (from === ZERO_ADDRESS || from === AUCTION_HOUSE.toLowerCase()) continue;
    if (to === ZERO_ADDRESS) continue;
    
    items.push({
      id: `transfer-${transfer.id}`,
      type: 'noun_transfer',
      timestamp: transfer.blockTimestamp,
      actor: from,
      nounId: transfer.noun.id,
      fromAddress: transfer.previousHolder.id,
      toAddress: transfer.newHolder.id,
    });
  }

  // Delegations (skip if there's a transfer at the same time)
  for (const delegation of data.delegationEvents) {
    const transferKey = `${delegation.noun.id}-${delegation.blockTimestamp}`;
    if (transferKeys.has(transferKey)) continue;
    
    const from = delegation.previousDelegate.id.toLowerCase();
    const to = delegation.newDelegate.id.toLowerCase();
    if (from === to) continue;

    items.push({
      id: `delegation-${delegation.id}`,
      type: 'noun_delegation',
      timestamp: delegation.blockTimestamp,
      actor: delegation.delegator.id,
      nounId: delegation.noun.id,
      fromAddress: delegation.previousDelegate.id,
      toAddress: delegation.newDelegate.id,
    });
  }

  // Auctions
  for (const auction of data.auctions) {
    if (auction.settled && auction.bidder) {
      const item: ActivityItem = {
        id: `auction-settled-${auction.id}`,
        type: 'auction_settled',
        timestamp: auction.endTime,
        actor: auction.bidder.id,
        nounId: auction.noun.id,
        winningBid: auction.amount,
        winner: auction.bidder.id,
      };
      items.push(item);
      auctionSettledItems.push(item);
    } else if (!auction.settled) {
      const item: ActivityItem = {
        id: `auction-started-${auction.id}`,
        type: 'auction_started',
        timestamp: auction.startTime,
        actor: AUCTION_HOUSE,
        nounId: auction.noun.id,
      };
      items.push(item);
      auctionStartedItems.push(item);
    }
  }

  return { items, auctionStartedItems, auctionSettledItems };
}

function processProposalUpdatesData(data: ProposalUpdatesQueryResult): ActivityItem[] {
  const items: ActivityItem[] = [];

  const proposalFirstVersions = new Map<string, string>();
  for (const version of data.proposalVersions) {
    const proposalId = version.proposal.id;
    const existingTime = proposalFirstVersions.get(proposalId);
    if (!existingTime || version.createdAt < existingTime) {
      proposalFirstVersions.set(proposalId, version.createdAt);
    }
  }
  
  for (const version of data.proposalVersions) {
    const proposalId = version.proposal.id;
    const firstVersionTime = proposalFirstVersions.get(proposalId);
    if (version.createdAt === firstVersionTime) continue;
    if (!version.updateMessage || version.updateMessage.trim() === '') continue;
    
    items.push({
      id: `proposal-updated-${version.id}`,
      type: 'proposal_updated',
      timestamp: version.createdAt,
      actor: version.proposal.proposer.id,
      proposalId: version.proposal.id,
      proposalTitle: version.title || version.proposal.title,
      updateMessage: version.updateMessage,
    });
  }

  return items;
}

// ============================================================================
// MAIN HOOK
// ============================================================================

export function useActivityFeed(first: number = 30) {
  // Get current Ethereum block number for accurate proposal status
  const { data: blockNumber } = useBlockNumber({
    watch: false, // Don't poll, just get once
  });
  const currentBlock = blockNumber ? Number(blockNumber) : undefined;
  
  // Only fetch activity from the last 14 days for performance
  // Round to the nearest hour to prevent query key changes on every render
  const sinceTimestamp = useMemo(() => {
    const fourteenDaysAgo = Math.floor(Date.now() / 1000) - (14 * 24 * 60 * 60);
    const roundedToHour = Math.floor(fourteenDaysAgo / 3600) * 3600;
    return roundedToHour.toString();
  }, []);

  const queries = useQueries({
    queries: [
      {
        queryKey: ['camp', 'activity', 'core', first, sinceTimestamp],
        queryFn: () => executeQuery<CoreQueryResult>(CORE_QUERY, first, sinceTimestamp),
        staleTime: 60000,
        gcTime: 300000,
        refetchInterval: 60000, // Poll every 60 seconds
      },
      {
        queryKey: ['camp', 'activity', 'candidates', first, sinceTimestamp],
        queryFn: () => executeQuery<CandidatesQueryResult>(CANDIDATES_QUERY, first, sinceTimestamp),
        staleTime: 60000,
        gcTime: 300000,
        refetchInterval: 60000,
      },
      {
        queryKey: ['camp', 'activity', 'nouns', first, sinceTimestamp],
        queryFn: () => executeQuery<NounsQueryResult>(NOUNS_QUERY, first, sinceTimestamp),
        staleTime: 60000,
        gcTime: 300000,
        refetchInterval: 60000,
      },
      {
        queryKey: ['camp', 'activity', 'updates', first, sinceTimestamp],
        queryFn: () => executeQuery<ProposalUpdatesQueryResult>(PROPOSAL_UPDATES_QUERY, first, sinceTimestamp),
        staleTime: 60000,
        gcTime: 300000,
        refetchInterval: 60000,
      },
    ],
    combine: (results) => {
      const isLoading = results.some(r => r.isLoading);
      const error = results.find(r => r.error)?.error;
      
      // Process available data (progressive loading)
      let allItems: ActivityItem[] = [];
      let auctionStartedItems: ActivityItem[] = [];
      let auctionSettledItems: ActivityItem[] = [];
      
      if (results[0].data) {
        allItems.push(...processCoreData(results[0].data, currentBlock));
      }
      if (results[1].data) {
        allItems.push(...processCandidatesData(results[1].data));
      }
      if (results[2].data) {
        const nounsResult = processNounsData(results[2].data);
        allItems.push(...nounsResult.items);
        auctionStartedItems = nounsResult.auctionStartedItems;
        auctionSettledItems = nounsResult.auctionSettledItems;
      }
      if (results[3].data) {
        allItems.push(...processProposalUpdatesData(results[3].data));
      }

      // Sort by timestamp descending
      allItems.sort((a, b) => Number(b.timestamp) - Number(a.timestamp));

      return {
        data: allItems.length > 0 ? allItems : undefined,
        isLoading,
        error,
        // Expose for settler enrichment
        _auctionItems: { auctionStartedItems, auctionSettledItems },
      };
    },
  });

  // Enrich auction items with settler info (separate query, non-blocking)
  const auctionItems = queries._auctionItems;
  const allAuctionItems = [...auctionItems.auctionStartedItems, ...auctionItems.auctionSettledItems];
  const nounIds = allAuctionItems.map(item => item.nounId).filter((id): id is string => !!id);

  // Fetch settler data in background (doesn't block initial render)
  if (nounIds.length > 0 && queries.data) {
    fetch('/api/nouns', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ids: nounIds }),
    })
      .then(res => res.json())
      .then(({ nouns }) => {
        for (const item of auctionItems.auctionStartedItems) {
          const noun = nouns[item.nounId!];
          if (noun?.settled_by_address && noun.settled_by_address !== '0x0000000000000000000000000000000000000000') {
            item.settler = noun.settled_by_address;
            item.actor = noun.settled_by_address;
          }
        }
        for (const item of auctionItems.auctionSettledItems) {
          const noun = nouns[item.nounId!];
          if (noun?.settled_by_address && noun.settled_by_address !== '0x0000000000000000000000000000000000000000') {
            item.settler = noun.settled_by_address;
          }
        }
      })
      .catch(() => {});
  }

  return {
    data: queries.data,
    isLoading: queries.isLoading,
    error: queries.error as Error | null,
  };
}
