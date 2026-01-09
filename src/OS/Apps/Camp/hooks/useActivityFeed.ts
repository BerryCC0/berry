/**
 * useActivityFeed Hook
 * Fetches unified activity feed from Goldsky
 * 
 * Includes:
 * - Votes on proposals
 * - Proposal feedback (signals)
 * - Proposal creation
 * - Candidate creation
 * - Noun transfers
 * - Noun delegations
 * - Auction settlements (with winner + bid)
 * - Auction starts
 */

'use client';

import { useQuery } from '@tanstack/react-query';
import { GOLDSKY_ENDPOINT } from '@/app/lib/nouns/constants';
import type { ActivityItem } from '../types';

const ACTIVITY_QUERY = `
  query ActivityFeed($first: Int!, $skip: Int!) {
    votes(
      first: $first
      skip: $skip
      orderBy: blockTimestamp
      orderDirection: desc
    ) {
      id
      voter {
        id
      }
      proposal {
        id
        title
      }
      supportDetailed
      votes
      reason
      blockTimestamp
    }
    
    proposalFeedbacks(
      first: $first
      skip: $skip
      orderBy: createdTimestamp
      orderDirection: desc
    ) {
      id
      voter {
        id
      }
      proposal {
        id
        title
      }
      supportDetailed
      reason
      createdTimestamp
    }
    
    proposals(
      first: $first
      skip: $skip
      orderBy: createdTimestamp
      orderDirection: desc
    ) {
      id
      title
      proposer {
        id
      }
      createdTimestamp
    }
    
    proposalCandidates(
      first: $first
      skip: $skip
      orderBy: createdTimestamp
      orderDirection: desc
      where: { canceled: false }
    ) {
      id
      proposer
      slug
      createdTimestamp
    }
    
    candidateFeedbacks(
      first: $first
      skip: $skip
      orderBy: createdTimestamp
      orderDirection: desc
    ) {
      id
      voter {
        id
      }
      candidate {
        id
        slug
        proposer
        latestVersion {
          content {
            title
          }
        }
      }
      supportDetailed
      votes
      reason
      createdTimestamp
    }
    
    transferEvents(
      first: $first
      skip: $skip
      orderBy: blockTimestamp
      orderDirection: desc
    ) {
      id
      noun {
        id
      }
      previousHolder {
        id
      }
      newHolder {
        id
      }
      blockTimestamp
    }
    
    delegationEvents(
      first: $first
      skip: $skip
      orderBy: blockTimestamp
      orderDirection: desc
    ) {
      id
      noun {
        id
      }
      delegator {
        id
      }
      previousDelegate {
        id
      }
      newDelegate {
        id
      }
      blockTimestamp
    }
    
    auctions(
      first: $first
      skip: $skip
      orderBy: startTime
      orderDirection: desc
    ) {
      id
      noun {
        id
      }
      amount
      bidder {
        id
      }
      settled
      startTime
      endTime
    }
    
    proposalCandidateSignatures(
      first: $first
      skip: $skip
      orderBy: createdTimestamp
      orderDirection: desc
      where: { canceled: false }
    ) {
      id
      signer {
        id
      }
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
      skip: $skip
      orderBy: createdTimestamp
      orderDirection: desc
    ) {
      id
      proposal {
        id
        slug
        proposer
      }
      createdTimestamp
      updateMessage
      content {
        title
      }
    }
    
    proposalVersions(
      first: $first
      skip: $skip
      orderBy: createdAt
      orderDirection: desc
    ) {
      id
      proposal {
        id
        title
        proposer {
          id
        }
      }
      createdAt
      updateMessage
      title
    }
  }
`;

interface ActivityQueryResult {
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
  }>;
  proposalCandidates: Array<{
    id: string;
    proposer: string;
    slug: string;
    createdTimestamp: string;
  }>;
  candidateFeedbacks: Array<{
    id: string;
    voter: { id: string };
    candidate: {
      id: string;
      slug: string;
      proposer: string;
      latestVersion: {
        content: {
          title: string;
        };
      } | null;
    };
    supportDetailed: number;
    votes: string;
    reason: string | null;
    createdTimestamp: string;
  }>;
  transferEvents: Array<{
    id: string; // This is the tx hash
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
    proposal: {
      id: string;
      slug: string;
      proposer: string;
    };
    createdTimestamp: string;
    updateMessage: string;
    content: {
      title: string;
    };
  }>;
  proposalVersions: Array<{
    id: string;
    proposal: {
      id: string;
      title: string;
      proposer: {
        id: string;
      };
    };
    createdAt: string;
    updateMessage: string;
    title: string;
  }>;
}

// Nouns Auction House and Treasury addresses (for filtering mints/burns)
const AUCTION_HOUSE = '0x830bd73e4184cef73443c15111a1df14e495c706';
const NOUNS_DAO = '0x0bc3807ec262cb779b38d65b38158acc3bfede10';
const ZERO_ADDRESS = '0x0000000000000000000000000000000000000000';

async function fetchActivity(first: number, skip: number): Promise<ActivityItem[]> {
  const response = await fetch(GOLDSKY_ENDPOINT, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      query: ACTIVITY_QUERY,
      variables: { first, skip },
    }),
  });

  const json = await response.json();
  if (json.errors) throw new Error(json.errors[0].message);

  const data = json.data as ActivityQueryResult;
  const items: ActivityItem[] = [];

  // Convert votes to activity items
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

  // Convert feedbacks to activity items
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

  // Convert candidate feedbacks to activity items
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

  // Convert proposal creations to activity items
  for (const proposal of data.proposals) {
    items.push({
      id: `proposal-created-${proposal.id}`,
      type: 'proposal_created',
      timestamp: proposal.createdTimestamp,
      actor: proposal.proposer.id,
      proposalId: proposal.id,
      proposalTitle: proposal.title,
    });
  }

  // Convert candidate creations to activity items
  for (const candidate of data.proposalCandidates) {
    items.push({
      id: `candidate-created-${candidate.id}`,
      type: 'candidate_created',
      timestamp: candidate.createdTimestamp,
      actor: candidate.proposer,
      candidateSlug: candidate.slug,
      candidateProposer: candidate.proposer,
    });
  }

  // Build a set of transfer keys (nounId + timestamp) to filter out auto-delegations
  // When a noun is transferred, delegation automatically follows - we only show the transfer
  const transferKeys = new Set<string>();
  
  // Collect transfer items to check for sales
  const transferItems: ActivityItem[] = [];
  
  // Convert transfers to activity items (filter out auction-related transfers)
  for (const transfer of data.transferEvents) {
    const fromLower = transfer.previousHolder.id.toLowerCase();
    const toLower = transfer.newHolder.id.toLowerCase();
    
    // Skip:
    // - Mints from zero address
    // - Transfers from auction house (noun won at auction - shown via auction_settled)
    // - Transfers TO auction house (noun going up for auction - shown via auction_started)
    // - Burns to zero address
    // - Transfers to treasury
    if (
      fromLower === ZERO_ADDRESS ||
      fromLower === AUCTION_HOUSE.toLowerCase() ||
      toLower === ZERO_ADDRESS ||
      toLower === AUCTION_HOUSE.toLowerCase() ||
      toLower === NOUNS_DAO.toLowerCase()
    ) {
      continue;
    }

    // Track this transfer to filter out the accompanying delegation
    transferKeys.add(`${transfer.noun.id}-${transfer.blockTimestamp}`);

    // The id field is in format "{txHash}_{nounId}" - extract just the tx hash
    const txHash = transfer.id.includes('_') 
      ? transfer.id.split('_')[0] 
      : transfer.id;
    
    const item: ActivityItem = {
      id: `transfer-${transfer.id}`,
      type: 'noun_transfer',
      timestamp: transfer.blockTimestamp,
      actor: transfer.previousHolder.id,
      nounId: transfer.noun.id,
      fromAddress: transfer.previousHolder.id,
      toAddress: transfer.newHolder.id,
      txHash,
    };
    items.push(item);
    transferItems.push(item);
  }

  // Check transfers for sale info (in parallel, limit to avoid rate limiting)
  const saleChecks = transferItems.slice(0, 10).map(async (item) => {
    if (!item.txHash) return;
    try {
      const response = await fetch(
        `/api/nouns/sale?txHash=${item.txHash}&seller=${item.fromAddress}`
      );
      if (response.ok) {
        const saleInfo = await response.json();
        if (saleInfo.isSale && saleInfo.price) {
          item.salePrice = saleInfo.price;
        }
      }
    } catch {
      // Sale info not available, leave as regular transfer
    }
  });
  await Promise.all(saleChecks);

  // Convert delegations to activity items
  for (const delegation of data.delegationEvents) {
    const delegatorLower = delegation.delegator.id.toLowerCase();
    const previousDelegateLower = delegation.previousDelegate.id.toLowerCase();
    const newDelegateLower = delegation.newDelegate.id.toLowerCase();
    const auctionHouseLower = AUCTION_HOUSE.toLowerCase();
    
    // Skip any delegation involving the auction house (in any role)
    // These are implied by auction start/settlement events
    if (
      delegatorLower === auctionHouseLower ||
      previousDelegateLower === auctionHouseLower ||
      newDelegateLower === auctionHouseLower
    ) {
      continue;
    }
    
    // Skip self-delegations and delegations to/from zero address
    if (
      newDelegateLower === delegatorLower ||
      newDelegateLower === ZERO_ADDRESS ||
      previousDelegateLower === ZERO_ADDRESS
    ) {
      continue;
    }

    // Skip delegations that occurred alongside a transfer (auto-delegation on transfer)
    const transferKey = `${delegation.noun.id}-${delegation.blockTimestamp}`;
    if (transferKeys.has(transferKey)) {
      continue;
    }

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

  // Convert auctions to activity items
  // Collect items that need settler info
  const auctionStartedItems: ActivityItem[] = [];
  const auctionSettledItems: ActivityItem[] = [];
  
  for (const auction of data.auctions) {
    if (auction.settled && auction.bidder) {
      // Auction ended/settled - settler will be fetched from next noun
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
      // Auction started - settler will be fetched below
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

  // Fetch settler info for auction_started events from our database
  // The settler is who created this noun by settling the previous auction
  await Promise.all(auctionStartedItems.map(async (item) => {
    try {
      const response = await fetch(`/api/nouns/${item.nounId}`);
      if (response.ok) {
        const noun = await response.json();
        if (noun.settled_by_address && noun.settled_by_address !== '0x0000000000000000000000000000000000000000') {
          item.settler = noun.settled_by_address;
          item.actor = noun.settled_by_address; // Update actor to be the settler
        }
      }
    } catch (error) {
      // Settler info not available, leave as auction house
    }
  }));

  // Fetch settler info for auction_settled events
  // The settler is who "chose" this noun by settling the previous auction
  await Promise.all(auctionSettledItems.map(async (item) => {
    try {
      const response = await fetch(`/api/nouns/${item.nounId}`);
      if (response.ok) {
        const noun = await response.json();
        if (noun.settled_by_address && noun.settled_by_address !== '0x0000000000000000000000000000000000000000') {
          item.settler = noun.settled_by_address;
        }
      }
    } catch (error) {
      // Settler info not available
    }
  }));

  // Convert candidate sponsorships to activity items
  for (const signature of data.proposalCandidateSignatures) {
    // Skip canceled signatures
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

  // Convert candidate version updates to activity items
  // Track which candidates we've seen to identify the first version (which is creation, not update)
  const candidateFirstVersions = new Map<string, string>();
  
  // First pass: find the earliest version for each candidate
  for (const version of data.proposalCandidateVersions) {
    const candidateId = version.proposal.id;
    const existingTime = candidateFirstVersions.get(candidateId);
    if (!existingTime || version.createdTimestamp < existingTime) {
      candidateFirstVersions.set(candidateId, version.createdTimestamp);
    }
  }
  
  // Second pass: only add non-first versions (actual updates)
  for (const version of data.proposalCandidateVersions) {
    const candidateId = version.proposal.id;
    const firstVersionTime = candidateFirstVersions.get(candidateId);
    
    // Skip the first version (that's the creation, not an update)
    if (version.createdTimestamp === firstVersionTime) continue;
    
    // Only show updates that have an update message
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

  // Convert proposal version updates to activity items
  // Track which proposals we've seen to identify the first version (which is creation, not update)
  const proposalFirstVersions = new Map<string, string>();
  
  // First pass: find the earliest version for each proposal
  for (const version of data.proposalVersions) {
    const proposalId = version.proposal.id;
    const existingTime = proposalFirstVersions.get(proposalId);
    if (!existingTime || version.createdAt < existingTime) {
      proposalFirstVersions.set(proposalId, version.createdAt);
    }
  }
  
  // Second pass: only add non-first versions (actual updates)
  for (const version of data.proposalVersions) {
    const proposalId = version.proposal.id;
    const firstVersionTime = proposalFirstVersions.get(proposalId);
    
    // Skip the first version (that's the creation, not an update)
    if (version.createdAt === firstVersionTime) continue;
    
    // Only show updates that have an update message
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

  // Sort by timestamp descending
  items.sort((a, b) => Number(b.timestamp) - Number(a.timestamp));

  return items;
}

export function useActivityFeed(first: number = 50) {
  return useQuery({
    queryKey: ['camp', 'activity', first],
    queryFn: () => fetchActivity(first, 0),
    staleTime: 30000, // 30 seconds
  });
}
