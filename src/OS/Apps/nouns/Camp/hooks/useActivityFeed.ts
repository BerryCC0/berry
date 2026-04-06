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

interface ApiVoteRow {
  id: string;
  voter: string;
  voter_ens: string | null;
  proposal_id: string;
  proposal_title: string | null;
  support: number;
  votes: string;
  reason: string | null;
  client_id: number | null;
  block_timestamp: string;
}

interface ApiProposalFeedbackRow {
  id: string;
  msg_sender: string;
  sender_ens: string | null;
  proposal_id: string;
  proposal_title: string | null;
  support: number;
  reason: string | null;
  block_timestamp: string;
}

interface ApiProposalRow {
  id: string;
  title: string;
  proposer: string;
  proposer_ens: string | null;
  created_timestamp: string;
  start_block: string;
  end_block: string;
  start_timestamp: string | null;
  end_timestamp: string | null;
  status: string | null;
  for_votes: string | null;
  against_votes: string | null;
  quorum_votes: string | null;
  cancelled_timestamp: string | null;
  queued_timestamp: string | null;
  executed_timestamp: string | null;
  vetoed_timestamp: string | null;
  client_id?: number | null;
}

interface ApiCandidateRow {
  id: string;
  proposer: string;
  proposer_ens: string | null;
  slug: string;
  title: string;
  created_timestamp: string;
}

interface ApiCandidateFeedbackRow {
  id: string;
  msg_sender: string;
  sender_ens: string | null;
  support: number;
  reason: string | null;
  block_timestamp: string;
  candidate_slug: string;
  candidate_proposer: string;
  candidate_title: string;
  votes: string | null;
}

interface ApiCandidateSignatureRow {
  id: string;
  signer: string;
  signer_ens: string | null;
  candidate_id: string;
  reason: string | null;
  block_timestamp: string;
  candidate_slug: string;
  candidate_proposer: string;
  candidate_title: string;
}

interface ApiTransferRow {
  id: string;
  from: string;
  to: string;
  from_ens: string | null;
  to_ens: string | null;
  token_id: string;
  block_timestamp: string;
  tx_hash: string | null;
}

interface ApiDelegationRow {
  id: string;
  delegator: string;
  delegator_ens: string | null;
  from_delegate: string;
  to_delegate: string;
  to_delegate_ens: string | null;
  block_timestamp: string;
  noun_ids: string | (string | number)[] | null;
}

interface ApiAuctionRow {
  noun_id: string;
  start_time: string;
  end_time: string;
  winner: string | null;
  winner_ens: string | null;
  amount: string | null;
  settled: boolean;
  noun_settler_address: string | null;
  settler_ens: string | null;
}

interface ApiProposalVersionRow {
  id: string;
  proposal_id: string;
  title: string;
  update_message: string | null;
  block_timestamp: string;
  proposal_title: string | null;
  proposer: string;
  proposer_ens: string | null;
}

interface ApiCandidateVersionRow {
  id: string;
  candidate_id: string;
  title: string;
  update_message: string | null;
  block_timestamp: string;
  candidate_slug: string;
  candidate_proposer: string;
  proposer_ens: string | null;
}

interface ActivityApiResponse {
  votes: ApiVoteRow[];
  proposalFeedback: ApiProposalFeedbackRow[];
  proposals: ApiProposalRow[];
  candidates: ApiCandidateRow[];
  candidateFeedback: ApiCandidateFeedbackRow[];
  candidateSignatures: ApiCandidateSignatureRow[];
  transfers: ApiTransferRow[];
  delegations: ApiDelegationRow[];
  auctions: ApiAuctionRow[];
  proposalVersions: ApiProposalVersionRow[];
  candidateVersions: ApiCandidateVersionRow[];
}

// ============================================================================
// DATA PROCESSING
// ============================================================================

function processVotes(votes: ApiVoteRow[]): ActivityItem[] {
  return votes.map(v => ({
    id: `vote-${v.id}`,
    type: 'vote' as const,
    timestamp: String(v.block_timestamp),
    actor: v.voter,
    actorEns: v.voter_ens || undefined,
    proposalId: String(v.proposal_id),
    proposalTitle: v.proposal_title || '',
    support: v.support,
    votes: String(v.votes),
    reason: v.reason || undefined,
    clientId: v.client_id ?? undefined,
  }));
}

function processProposalFeedback(feedback: ApiProposalFeedbackRow[]): ActivityItem[] {
  return feedback.map(f => ({
    id: `feedback-${f.id}`,
    type: 'proposal_feedback' as const,
    timestamp: String(f.block_timestamp),
    actor: f.msg_sender,
    actorEns: f.sender_ens || undefined,
    proposalId: String(f.proposal_id),
    proposalTitle: f.proposal_title || '',
    support: f.support,
    reason: f.reason || undefined,
  }));
}

function processProposals(proposals: ApiProposalRow[], currentBlock: number | undefined): ActivityItem[] {
  const items: ActivityItem[] = [];

  for (const p of proposals) {
    const startBlock = Number(p.start_block);
    const endBlock = Number(p.end_block);
    const forVotes = BigInt(p.for_votes || '0');
    const againstVotes = BigInt(p.against_votes || '0');
    const quorumVotes = BigInt(p.quorum_votes || '0');
    const status = (p.status || '').toUpperCase();

    let derivedStatus: 'active' | 'pending' | 'succeeded' | 'defeated' | undefined;
    const isCancelled = status === 'CANCELLED';
    const isExecuted = status === 'EXECUTED';
    const isQueued = status === 'QUEUED';
    const isTerminal = isCancelled || isExecuted || isQueued
      || status === 'DEFEATED' || status === 'VETOED' || status === 'EXPIRED';
    let votingEnded = false;

    if (currentBlock !== undefined) {
      if (isTerminal) {
        // Terminal statuses override block-based derivation
        votingEnded = true;
        if (isCancelled || status === 'DEFEATED' || status === 'VETOED' || status === 'EXPIRED') {
          derivedStatus = 'defeated';
        } else {
          derivedStatus = 'succeeded';
        }
      } else if (currentBlock < startBlock) {
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
        actorEns: p.proposer_ens || undefined,
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

      // Use real lifecycle timestamp when available (from Ponder event indexing)
      const lifecycleTimestamp = isCancelled ? p.cancelled_timestamp
        : isQueued ? p.queued_timestamp
        : isExecuted ? p.executed_timestamp
        : status === 'VETOED' ? p.vetoed_timestamp
        : null;

      if (lifecycleTimestamp) {
        endTimestamp = String(lifecycleTimestamp);
      } else if (currentBlock !== undefined && currentBlock > endBlock) {
        // Voting period has passed -- estimate when the end block was mined
        const blocksAgo = currentBlock - endBlock;
        const secondsAgo = blocksAgo * BLOCK_TIME_SECONDS;
        endTimestamp = String(now - secondsAgo);
      } else {
        // Voting period hasn't ended yet (proposal was terminated early)
        // or block number isn't available. Estimate end time from blocks.
        const createdTime = Number(p.created_timestamp);
        const estimatedEnd = createdTime + Math.abs(endBlock - startBlock) * BLOCK_TIME_SECONDS;
        // Cap at current time so terminated-early proposals don't get future timestamps
        endTimestamp = String(Math.min(estimatedEnd, now));
      }

      const actorEns = p.proposer_ens || undefined;
      if (isCancelled) {
        items.push({
          id: `proposal-cancelled-${p.id}`,
          type: 'proposal_cancelled',
          timestamp: endTimestamp,
          actor: p.proposer,
          actorEns,
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
          actorEns,
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
          actorEns,
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
          actorEns,
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
          actorEns,
          proposalId: String(p.id),
          proposalTitle: p.title,
          proposalStatus: 'defeated',
        });
      }
    }
  }

  return items;
}

function processCandidates(candidates: ApiCandidateRow[]): ActivityItem[] {
  return candidates.map(c => ({
    id: `candidate-created-${c.id}`,
    type: 'candidate_created' as const,
    timestamp: String(c.created_timestamp),
    actor: c.proposer,
    actorEns: c.proposer_ens || undefined,
    candidateSlug: c.slug,
    candidateTitle: c.title,
    candidateProposer: c.proposer,
  }));
}

function processCandidateFeedback(feedback: ApiCandidateFeedbackRow[]): ActivityItem[] {
  return feedback.map(f => ({
    id: `candidate-feedback-${f.id}`,
    type: 'candidate_feedback' as const,
    timestamp: String(f.block_timestamp),
    actor: f.msg_sender,
    actorEns: f.sender_ens || undefined,
    candidateSlug: f.candidate_slug,
    candidateProposer: f.candidate_proposer,
    candidateTitle: f.candidate_title,
    support: f.support,
    votes: String(f.votes ?? '1'),
    reason: f.reason || undefined,
  }));
}

function processCandidateSignatures(signatures: ApiCandidateSignatureRow[]): ActivityItem[] {
  return signatures.map(s => ({
    id: `candidate-sponsored-${s.id}`,
    type: 'candidate_sponsored' as const,
    timestamp: String(s.block_timestamp),
    actor: s.signer,
    actorEns: s.signer_ens || undefined,
    candidateSlug: s.candidate_slug,
    candidateTitle: s.candidate_title,
    candidateProposer: s.candidate_proposer,
    reason: s.reason || undefined,
    sponsorCanceled: false,
  }));
}

function processTransfers(transfers: ApiTransferRow[]): ActivityItem[] {
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
      actorEns: t.from_ens || undefined,
      nounId: String(t.token_id),
      fromAddress: t.from,
      fromAddressEns: t.from_ens || undefined,
      toAddress: t.to,
      toAddressEns: t.to_ens || undefined,
      txHash: t.tx_hash || undefined,
    });
  }

  // Group multi-noun purchases: transfers sharing the same txHash and buyer (toAddress)
  const grouped = new Map<string, ActivityItem[]>();
  const ungrouped: ActivityItem[] = [];

  for (const item of items) {
    if (item.txHash && item.toAddress) {
      const key = `${item.txHash}-${item.toAddress.toLowerCase()}`;
      const group = grouped.get(key);
      if (group) {
        group.push(item);
      } else {
        grouped.set(key, [item]);
      }
    } else {
      ungrouped.push(item);
    }
  }

  const txGrouped: ActivityItem[] = [...ungrouped];

  for (const group of grouped.values()) {
    if (group.length === 1) {
      txGrouped.push(group[0]);
    } else {
      // Multi-noun purchase: merge into a single bulk activity item
      // actor = the buyer (common toAddress)
      const buyer = group[0].toAddress!;
      const nounIds = group.map(g => g.nounId!);
      const fromAddresses = [...new Set(group.map(g => g.fromAddress!))];
      const earliestTimestamp = group.reduce(
        (min, g) => (g.timestamp < min ? g.timestamp : min),
        group[0].timestamp
      );

      txGrouped.push({
        id: `bulk-transfer-${group[0].txHash}`,
        type: 'noun_transfer',
        timestamp: earliestTimestamp,
        actor: buyer,
        actorEns: group[0].toAddressEns,
        txHash: group[0].txHash,
        toAddress: buyer,
        toAddressEns: group[0].toAddressEns,
        isBulkTransfer: true,
        nounIds,
        fromAddresses,
        fromAddressEns: group[0].fromAddressEns,
        nounId: nounIds[0],
        fromAddress: fromAddresses[0],
      });
    }
  }

  // --- Pass 2: Group same from→to pairs within a 1-hour time window ---
  // This catches cases like "bid.autismcentral.eth transferred Nouns 1619,
  // 1732, 1762, 1811 to vault.autismcentral.eth" across separate transactions.
  const TIME_WINDOW = 3600; // 1 hour in seconds

  // Sort by timestamp so we can cluster adjacent items
  txGrouped.sort((a, b) => Number(a.timestamp) - Number(b.timestamp));

  const result: ActivityItem[] = [];
  const consumed = new Set<number>();

  for (let i = 0; i < txGrouped.length; i++) {
    if (consumed.has(i)) continue;
    const item = txGrouped[i];

    // Only group non-bulk single transfers that have both from and to
    if (item.isBulkTransfer || !item.fromAddress || !item.toAddress) {
      result.push(item);
      continue;
    }

    const fromKey = item.fromAddress.toLowerCase();
    const toKey = item.toAddress.toLowerCase();
    const baseTime = Number(item.timestamp);

    // Collect all matching transfers within the time window
    const cluster: ActivityItem[] = [item];
    consumed.add(i);

    for (let j = i + 1; j < txGrouped.length; j++) {
      if (consumed.has(j)) continue;
      const other = txGrouped[j];
      if (other.isBulkTransfer || !other.fromAddress || !other.toAddress) continue;

      const timeDiff = Math.abs(Number(other.timestamp) - baseTime);
      if (timeDiff > TIME_WINDOW) break; // Sorted, so no more matches possible

      if (
        other.fromAddress.toLowerCase() === fromKey &&
        other.toAddress.toLowerCase() === toKey
      ) {
        cluster.push(other);
        consumed.add(j);
      }
    }

    if (cluster.length === 1) {
      result.push(item);
    } else {
      // Merge into a bulk transfer: actor = sender (from), to = receiver
      const nounIds = cluster.map(c => c.nounId!).filter(Boolean);
      const latestTimestamp = cluster.reduce(
        (max, c) => (c.timestamp > max ? c.timestamp : max),
        cluster[0].timestamp
      );

      result.push({
        id: `bulk-pair-${fromKey.slice(0, 8)}-${toKey.slice(0, 8)}-${latestTimestamp}`,
        type: 'noun_transfer',
        timestamp: latestTimestamp,
        actor: item.fromAddress!,
        actorEns: item.actorEns ?? item.fromAddressEns,
        toAddress: item.toAddress!,
        toAddressEns: item.toAddressEns,
        isBulkTransfer: true,
        nounIds,
        nounId: nounIds[0],
        fromAddress: item.fromAddress!,
        fromAddressEns: item.fromAddressEns,
        fromAddresses: [item.fromAddress!],
      });
    }
  }

  return result;
}

function processDelegations(delegations: ApiDelegationRow[]): ActivityItem[] {
  return delegations.map(d => {
    const nounIdList: (string | number)[] = Array.isArray(d.noun_ids) ? d.noun_ids : [];
    return {
      id: `delegation-${d.id}`,
      type: 'noun_delegation' as const,
      timestamp: String(d.block_timestamp),
      actor: d.delegator,
      actorEns: d.delegator_ens || undefined,
      fromAddress: d.from_delegate,
      toAddress: d.to_delegate,
      toAddressEns: d.to_delegate_ens || undefined,
      // If they own a single noun, set nounId for the image
      ...(nounIdList.length === 1 && { nounId: String(nounIdList[0]) }),
      // If they own multiple nouns, set nounIds for bulk display
      ...(nounIdList.length > 1 && { nounIds: nounIdList.map(String) }),
    };
  });
}

function processAuctions(auctions: ApiAuctionRow[]): {
  items: ActivityItem[];
  auctionStartedItems: ActivityItem[];
  auctionSettledItems: ActivityItem[];
} {
  const items: ActivityItem[] = [];
  const auctionStartedItems: ActivityItem[] = [];
  const auctionSettledItems: ActivityItem[] = [];

  for (const a of auctions) {
    // noun_settler_address comes from the nouns table (set by AuctionCreated),
    // which is the person who chose this noun's appearance (settler of auction N-1).
    const nounSettler = a.noun_settler_address || undefined;
    const settlerEns = a.settler_ens || undefined;

    if (a.settled && a.winner) {
      const item: ActivityItem = {
        id: `auction-settled-${a.noun_id}`,
        type: 'auction_settled',
        timestamp: String(a.end_time),
        actor: a.winner,
        actorEns: a.winner_ens || undefined,
        nounId: String(a.noun_id),
        winningBid: String(a.amount),
        winner: a.winner,
        winnerEns: a.winner_ens || undefined,
        settler: nounSettler,
        settlerEns,
      };
      items.push(item);
      auctionSettledItems.push(item);
    } else if (!a.settled) {
      const item: ActivityItem = {
        id: `auction-started-${a.noun_id}`,
        type: 'auction_started',
        timestamp: String(a.start_time),
        actor: nounSettler || AUCTION_HOUSE,
        actorEns: settlerEns,
        nounId: String(a.noun_id),
        settler: nounSettler,
        settlerEns,
      };
      items.push(item);
      auctionStartedItems.push(item);
    }
  }

  return { items, auctionStartedItems, auctionSettledItems };
}

function processProposalVersions(versions: ApiProposalVersionRow[]): ActivityItem[] {
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
      actorEns: v.proposer_ens || undefined,
      proposalId: pid,
      proposalTitle: v.title || v.proposal_title || '',
      updateMessage: v.update_message,
    });
  }

  return items;
}

function processCandidateVersions(versions: ApiCandidateVersionRow[]): ActivityItem[] {
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
      actorEns: v.proposer_ens || undefined,
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
    queryFn: async (): Promise<ActivityItem[]> => {
      const params = new URLSearchParams({
        limit: String(first),
        since: sinceTimestamp,
      });

      const response = await fetch(`/api/activity?${params}`);
      if (!response.ok) throw new Error('Failed to fetch activity');

      const data: ActivityApiResponse = await response.json();

      // Process all activity types
      const allItems: ActivityItem[] = [];

      allItems.push(...processVotes(data.votes || []));
      allItems.push(...processProposalFeedback(data.proposalFeedback || []));
      allItems.push(...processProposals(data.proposals || [], currentBlock));
      allItems.push(...processCandidates(data.candidates || []));
      allItems.push(...processCandidateFeedback(data.candidateFeedback || []));
      allItems.push(...processCandidateSignatures(data.candidateSignatures || []));
      allItems.push(...processTransfers(data.transfers || []));
      allItems.push(...processDelegations(data.delegations || []));
      allItems.push(...processAuctions(data.auctions || []).items);

      allItems.push(...processProposalVersions(data.proposalVersions || []));
      allItems.push(...processCandidateVersions(data.candidateVersions || []));

      // Sort by timestamp descending
      allItems.sort((a, b) => Number(b.timestamp) - Number(a.timestamp));

      return allItems;
    },
    staleTime: 60000,
    gcTime: 300000,
    refetchInterval: 60000,
  });

  return {
    data: query.data,
    isLoading: query.isLoading,
    error: query.error as Error | null,
  };
}
