/**
 * useActivityFeed Hook
 * Fetches unified activity feed from Ponder API
 *
 * Uses a single /api/activity endpoint that returns all activity types
 * in parallel from ponder_live tables.
 */

'use client';

import { useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useBlockNumber } from 'wagmi';
import type { ActivityItem } from '../types';

// ============================================================================
// CONSTANTS
// ============================================================================

const AUCTION_HOUSE = '0x830bd73e4184cef73443c15111a1df14e495c706';
const NOUNS_TREASURY = '0xb1a32fc9f9d8b2cf86c068cae13108809547ef71';
const ZERO_ADDRESS = '0x0000000000000000000000000000000000000000';
const BLOCK_TIME_SECONDS = 12;

// ============================================================================
// API RESPONSE TYPES
// ============================================================================

interface ActivityApiResponse {
  votes: any[];
  proposalFeedback: any[];
  proposals: any[];
  candidates: any[];
  candidateFeedback: any[];
  candidateSignatures: any[];
  transfers: any[];
  delegations: any[];
  auctions: any[];
  proposalVersions: any[];
  candidateVersions: any[];
}

// ============================================================================
// DATA PROCESSING
// ============================================================================

function processVotes(votes: any[]): ActivityItem[] {
  return votes.map(v => ({
    id: `vote-${v.id}`,
    type: 'vote' as const,
    timestamp: String(v.block_timestamp),
    actor: v.voter,
    proposalId: String(v.proposal_id),
    proposalTitle: v.proposal_title || '',
    support: v.support,
    votes: String(v.votes),
    reason: v.reason || undefined,
    clientId: v.client_id ?? undefined,
  }));
}

function processProposalFeedback(feedback: any[]): ActivityItem[] {
  return feedback.map(f => ({
    id: `feedback-${f.id}`,
    type: 'proposal_feedback' as const,
    timestamp: String(f.block_timestamp),
    actor: f.msg_sender,
    proposalId: String(f.proposal_id),
    proposalTitle: f.proposal_title || '',
    support: f.support,
    reason: f.reason || undefined,
  }));
}

function processProposals(proposals: any[], currentBlock: number | undefined): ActivityItem[] {
  const items: ActivityItem[] = [];

  for (const p of proposals) {
    const startBlock = Number(p.start_block);
    const endBlock = Number(p.end_block);
    const forVotes = BigInt(p.for_votes || '0');
    const againstVotes = BigInt(p.against_votes || '0');
    const quorumVotes = BigInt(p.quorum_votes || '0');
    const status = (p.status || '').toUpperCase();

    let derivedStatus: 'active' | 'pending' | 'succeeded' | 'defeated' | undefined;
    let isCancelled = status === 'CANCELLED';
    let isExecuted = status === 'EXECUTED';
    let isQueued = status === 'QUEUED';
    let votingEnded = false;

    if (currentBlock !== undefined) {
      if (currentBlock < startBlock) {
        derivedStatus = 'pending';
      } else if (currentBlock >= startBlock && currentBlock <= endBlock) {
        derivedStatus = 'active';
      } else {
        votingEnded = true;
        derivedStatus = (forVotes > againstVotes && forVotes >= quorumVotes)
          ? 'succeeded' : 'defeated';
      }
    } else {
      if (status === 'PENDING') derivedStatus = 'pending';
      else if (status === 'ACTIVE') derivedStatus = 'active';
      else if (['SUCCEEDED', 'QUEUED', 'EXECUTED'].includes(status)) {
        derivedStatus = 'succeeded';
        votingEnded = true;
      } else if (['DEFEATED', 'VETOED', 'CANCELLED', 'EXPIRED'].includes(status)) {
        derivedStatus = 'defeated';
        votingEnded = true;
      } else {
        const totalVotes = forVotes + againstVotes;
        if (totalVotes > BigInt(0)) {
          derivedStatus = (forVotes > againstVotes && forVotes >= quorumVotes)
            ? 'succeeded' : 'defeated';
          votingEnded = true;
        } else {
          derivedStatus = 'pending';
        }
      }
    }

    // Show active or pending proposals as "created"
    if (derivedStatus === 'active' || derivedStatus === 'pending') {
      items.push({
        id: `proposal-created-${p.id}`,
        type: 'proposal_created',
        timestamp: String(p.created_timestamp),
        actor: p.proposer,
        proposalId: String(p.id),
        proposalTitle: p.title,
        proposalStatus: derivedStatus,
        clientId: p.client_id ?? undefined,
      });
    }

    // Show proposal outcomes when voting has ended
    if (votingEnded) {
      const now = Math.floor(Date.now() / 1000);
      let endTimestamp: string;

      if (currentBlock !== undefined && currentBlock > endBlock) {
        const blocksAgo = currentBlock - endBlock;
        const secondsAgo = blocksAgo * BLOCK_TIME_SECONDS;
        endTimestamp = String(now - secondsAgo);
      } else {
        const createdTime = Number(p.created_timestamp);
        endTimestamp = String(createdTime + Math.abs(endBlock - startBlock) * BLOCK_TIME_SECONDS);
      }

      if (isCancelled) {
        items.push({
          id: `proposal-cancelled-${p.id}`,
          type: 'proposal_cancelled',
          timestamp: endTimestamp,
          actor: p.proposer,
          proposalId: String(p.id),
          proposalTitle: p.title,
          proposalStatus: 'defeated',
        });
      } else if (isExecuted) {
        items.push({
          id: `proposal-executed-${p.id}`,
          type: 'proposal_executed',
          timestamp: endTimestamp,
          actor: p.proposer,
          proposalId: String(p.id),
          proposalTitle: p.title,
          proposalStatus: 'succeeded',
        });
      } else if (isQueued) {
        items.push({
          id: `proposal-queued-${p.id}`,
          type: 'proposal_queued',
          timestamp: endTimestamp,
          actor: p.proposer,
          proposalId: String(p.id),
          proposalTitle: p.title,
          proposalStatus: 'succeeded',
        });
      } else if (derivedStatus === 'succeeded') {
        items.push({
          id: `proposal-succeeded-${p.id}`,
          type: 'proposal_succeeded',
          timestamp: endTimestamp,
          actor: p.proposer,
          proposalId: String(p.id),
          proposalTitle: p.title,
          proposalStatus: 'succeeded',
        });
      } else if (derivedStatus === 'defeated') {
        items.push({
          id: `proposal-defeated-${p.id}`,
          type: 'proposal_defeated',
          timestamp: endTimestamp,
          actor: p.proposer,
          proposalId: String(p.id),
          proposalTitle: p.title,
          proposalStatus: 'defeated',
        });
      }
    }
  }

  return items;
}

function processCandidates(candidates: any[]): ActivityItem[] {
  return candidates.map(c => ({
    id: `candidate-created-${c.id}`,
    type: 'candidate_created' as const,
    timestamp: String(c.created_timestamp),
    actor: c.proposer,
    candidateSlug: c.slug,
    candidateTitle: c.title,
    candidateProposer: c.proposer,
  }));
}

function processCandidateFeedback(feedback: any[]): ActivityItem[] {
  return feedback.map(f => ({
    id: `candidate-feedback-${f.id}`,
    type: 'candidate_feedback' as const,
    timestamp: String(f.block_timestamp),
    actor: f.msg_sender,
    candidateSlug: f.candidate_slug,
    candidateProposer: f.candidate_proposer,
    candidateTitle: f.candidate_title,
    support: f.support,
    votes: String(f.votes ?? '1'),
    reason: f.reason || undefined,
  }));
}

function processCandidateSignatures(signatures: any[]): ActivityItem[] {
  return signatures.map(s => ({
    id: `candidate-sponsored-${s.id}`,
    type: 'candidate_sponsored' as const,
    timestamp: String(s.block_timestamp),
    actor: s.signer,
    candidateSlug: s.candidate_slug,
    candidateTitle: s.candidate_title,
    candidateProposer: s.candidate_proposer,
    reason: s.reason || undefined,
    sponsorCanceled: false,
  }));
}

function processTransfers(transfers: any[]): ActivityItem[] {
  const items: ActivityItem[] = [];

  for (const t of transfers) {
    const from = (t.from || '').toLowerCase();
    const to = (t.to || '').toLowerCase();

    // Filter out mints, auction settlements, and treasury-to-auction transfers
    if (from === ZERO_ADDRESS || from === AUCTION_HOUSE.toLowerCase()) continue;
    if (to === ZERO_ADDRESS) continue;
    if (from === NOUNS_TREASURY && to === AUCTION_HOUSE.toLowerCase()) continue;

    items.push({
      id: `transfer-${t.id}`,
      type: 'noun_transfer',
      timestamp: String(t.block_timestamp),
      actor: from,
      nounId: String(t.token_id),
      fromAddress: t.from,
      toAddress: t.to,
      txHash: t.tx_hash,
    });
  }

  return items;
}

function processDelegations(delegations: any[]): ActivityItem[] {
  return delegations.map(d => ({
    id: `delegation-${d.id}`,
    type: 'noun_delegation' as const,
    timestamp: String(d.block_timestamp),
    actor: d.delegator,
    fromAddress: d.from_delegate,
    toAddress: d.to_delegate,
  }));
}

function processAuctions(auctions: any[]): {
  items: ActivityItem[];
  auctionStartedItems: ActivityItem[];
  auctionSettledItems: ActivityItem[];
} {
  const items: ActivityItem[] = [];
  const auctionStartedItems: ActivityItem[] = [];
  const auctionSettledItems: ActivityItem[] = [];

  for (const a of auctions) {
    if (a.settled && a.winner) {
      const item: ActivityItem = {
        id: `auction-settled-${a.noun_id}`,
        type: 'auction_settled',
        timestamp: String(a.end_time),
        actor: a.winner,
        nounId: String(a.noun_id),
        winningBid: String(a.amount),
        winner: a.winner,
        settler: a.settler_address || undefined,
      };
      items.push(item);
      auctionSettledItems.push(item);
    } else if (!a.settled) {
      const item: ActivityItem = {
        id: `auction-started-${a.noun_id}`,
        type: 'auction_started',
        timestamp: String(a.start_time),
        actor: a.settler_address || AUCTION_HOUSE,
        nounId: String(a.noun_id),
        settler: a.settler_address || undefined,
      };
      items.push(item);
      auctionStartedItems.push(item);
    }
  }

  return { items, auctionStartedItems, auctionSettledItems };
}

function processProposalVersions(versions: any[]): ActivityItem[] {
  const items: ActivityItem[] = [];

  // Track first version per proposal to skip creation versions
  const proposalFirstVersions = new Map<string, string>();
  for (const v of versions) {
    const pid = String(v.proposal_id);
    const ts = String(v.block_timestamp);
    const existing = proposalFirstVersions.get(pid);
    if (!existing || ts < existing) {
      proposalFirstVersions.set(pid, ts);
    }
  }

  for (const v of versions) {
    const pid = String(v.proposal_id);
    const ts = String(v.block_timestamp);
    const firstVersionTime = proposalFirstVersions.get(pid);
    if (ts === firstVersionTime) continue;
    if (!v.update_message || v.update_message.trim() === '') continue;

    items.push({
      id: `proposal-updated-${v.id}`,
      type: 'proposal_updated',
      timestamp: ts,
      actor: v.proposer,
      proposalId: pid,
      proposalTitle: v.title || v.proposal_title || '',
      updateMessage: v.update_message,
    });
  }

  return items;
}

function processCandidateVersions(versions: any[]): ActivityItem[] {
  const items: ActivityItem[] = [];

  const candidateFirstVersions = new Map<string, string>();
  for (const v of versions) {
    const cid = v.candidate_id;
    const ts = String(v.block_timestamp);
    const existing = candidateFirstVersions.get(cid);
    if (!existing || ts < existing) {
      candidateFirstVersions.set(cid, ts);
    }
  }

  for (const v of versions) {
    const cid = v.candidate_id;
    const ts = String(v.block_timestamp);
    const firstVersionTime = candidateFirstVersions.get(cid);
    if (ts === firstVersionTime) continue;
    if (!v.update_message || v.update_message.trim() === '') continue;

    items.push({
      id: `candidate-updated-${v.id}`,
      type: 'candidate_updated',
      timestamp: ts,
      actor: v.candidate_proposer,
      candidateSlug: v.candidate_slug,
      candidateProposer: v.candidate_proposer,
      candidateTitle: v.title,
      updateMessage: v.update_message,
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
    watch: false,
  });
  const currentBlock = blockNumber ? Number(blockNumber) : undefined;

  // Only fetch activity from the last 14 days
  // Round to the nearest hour to prevent query key changes on every render
  const sinceTimestamp = useMemo(() => {
    const fourteenDaysAgo = Math.floor(Date.now() / 1000) - (14 * 24 * 60 * 60);
    const roundedToHour = Math.floor(fourteenDaysAgo / 3600) * 3600;
    return roundedToHour.toString();
  }, []);

  const query = useQuery({
    queryKey: ['camp', 'activity', first, sinceTimestamp],
    queryFn: async (): Promise<{
      items: ActivityItem[];
      _auctionItems: {
        auctionStartedItems: ActivityItem[];
        auctionSettledItems: ActivityItem[];
      };
    }> => {
      const params = new URLSearchParams({
        limit: String(first),
        since: sinceTimestamp,
      });

      const response = await fetch(`/api/activity?${params}`);
      if (!response.ok) throw new Error('Failed to fetch activity');

      const data: ActivityApiResponse = await response.json();

      // Process all activity types
      let allItems: ActivityItem[] = [];
      let auctionStartedItems: ActivityItem[] = [];
      let auctionSettledItems: ActivityItem[] = [];

      allItems.push(...processVotes(data.votes || []));
      allItems.push(...processProposalFeedback(data.proposalFeedback || []));
      allItems.push(...processProposals(data.proposals || [], currentBlock));
      allItems.push(...processCandidates(data.candidates || []));
      allItems.push(...processCandidateFeedback(data.candidateFeedback || []));
      allItems.push(...processCandidateSignatures(data.candidateSignatures || []));
      allItems.push(...processTransfers(data.transfers || []));
      allItems.push(...processDelegations(data.delegations || []));

      const auctionResult = processAuctions(data.auctions || []);
      allItems.push(...auctionResult.items);
      auctionStartedItems = auctionResult.auctionStartedItems;
      auctionSettledItems = auctionResult.auctionSettledItems;

      allItems.push(...processProposalVersions(data.proposalVersions || []));
      allItems.push(...processCandidateVersions(data.candidateVersions || []));

      // Sort by timestamp descending
      allItems.sort((a, b) => Number(b.timestamp) - Number(a.timestamp));

      return {
        items: allItems,
        _auctionItems: { auctionStartedItems, auctionSettledItems },
      };
    },
    staleTime: 60000,
    gcTime: 300000,
    refetchInterval: 60000,
  });

  // Enrich auction items with settler info (separate query, non-blocking)
  const auctionItems = query.data?._auctionItems;
  if (auctionItems && query.data?.items) {
    const allAuctionItems = [...auctionItems.auctionStartedItems, ...auctionItems.auctionSettledItems];
    const nounIds = allAuctionItems.map(item => item.nounId).filter((id): id is string => !!id);

    if (nounIds.length > 0) {
      fetch('/api/nouns', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ids: nounIds }),
      })
        .then(res => res.json())
        .then(({ nouns }) => {
          for (const item of auctionItems.auctionStartedItems) {
            const noun = nouns[item.nounId!];
            if (noun?.settled_by_address && noun.settled_by_address !== ZERO_ADDRESS) {
              item.settler = noun.settled_by_address;
              item.actor = noun.settled_by_address;
            }
          }
          for (const item of auctionItems.auctionSettledItems) {
            const noun = nouns[item.nounId!];
            if (noun?.settled_by_address && noun.settled_by_address !== ZERO_ADDRESS) {
              item.settler = noun.settled_by_address;
            }
          }
        })
        .catch(() => {});
    }
  }

  return {
    data: query.data?.items,
    isLoading: query.isLoading,
    error: query.error as Error | null,
  };
}
