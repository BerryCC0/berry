/**
 * Computed / memoized data for Client Incentives charts and views
 */

'use client';

import { useMemo, useCallback } from 'react';
import type { ClientData, RewardUpdate, CycleVoteEntry, CycleProposalVoteEntry } from './useClientIncentives';
import type { Proposal } from '@/OS/Apps/Camp/types';
import { weiToEth, shortDate } from '../utils';
import { CHART_COLORS } from '../constants';
import { getClientName } from '@/OS/lib/clientNames';

// ============================================================================
// Types
// ============================================================================

export interface Totals {
  rewarded: number;
  withdrawn: number;
  balance: number;
  count: number;
  bids: number;
}

export interface DistributionItem {
  clientId: number;
  name: string;
  count: number;
  pct: number;
  color: string;
}

export interface RewardEconDataPoint {
  label: string;
  date: string;
  rewardPerProposal: number;
  rewardPerVote: number;
  rewardPerAuction: number;
}

export interface RevenueDataPoint {
  label: string;
  date: string;
  revenue: number;
  rewardPerProposal: number;
}

export interface ProposalBreakdownEntry {
  clientId: number;
  name: string;
  voteCount: number;
  estimatedVoteReward: number;
  isProposer: boolean;
  estimatedProposalReward: number;
}

// ============================================================================
// Hook
// ============================================================================

export function useChartData(
  clients: ClientData[] | undefined,
  rewardUpdates: RewardUpdate[] | undefined,
  proposals: Proposal[] | undefined,
  nextProposalIdToReward: bigint | number | undefined | null,
  cycleVotes?: CycleVoteEntry[],
  votesByProposal?: CycleProposalVoteEntry[],
  pendingRevenue?: unknown,
  proposalRewardParams?: { proposalRewardBps: number | bigint; votingRewardBps: number | bigint; proposalEligibilityQuorumBps: number | bigint } | null,
) {
  // Computed totals
  const totals = useMemo<Totals>(() => {
    if (!clients?.length) return { rewarded: 0, withdrawn: 0, balance: 0, count: 0, bids: 0 };
    let rewarded = 0, withdrawn = 0, bids = 0;
    for (const c of clients) {
      rewarded += weiToEth(c.totalRewarded);
      withdrawn += weiToEth(c.totalWithdrawn);
      bids += c.bidCount;
    }
    return { rewarded, withdrawn, balance: rewarded - withdrawn, count: clients.length, bids };
  }, [clients]);

  // Sorted clients
  const getSortedClients = useCallback((sortField: string, sortDir: 'asc' | 'desc') => {
    if (!clients?.length) return [];
    const arr = [...clients];
    arr.sort((a, b) => {
      let aVal: number, bVal: number;
      switch (sortField) {
        case 'totalRewarded':
          aVal = weiToEth(a.totalRewarded); bVal = weiToEth(b.totalRewarded); break;
        case 'balance':
          aVal = weiToEth(a.totalRewarded) - weiToEth(a.totalWithdrawn);
          bVal = weiToEth(b.totalRewarded) - weiToEth(b.totalWithdrawn); break;
        case 'voteCount': aVal = a.voteCount; bVal = b.voteCount; break;
        case 'proposalCount': aVal = a.proposalCount; bVal = b.proposalCount; break;
        case 'auctionCount': aVal = a.auctionCount; bVal = b.auctionCount; break;
        case 'bidCount': aVal = a.bidCount; bVal = b.bidCount; break;
        default: aVal = weiToEth(a.totalRewarded); bVal = weiToEth(b.totalRewarded);
      }
      return sortDir === 'desc' ? bVal - aVal : aVal - bVal;
    });
    return arr;
  }, [clients]);

  // Reward economics chart data (from ProposalRewardsUpdated events)
  const rewardEconData = useMemo<RewardEconDataPoint[]>(() => {
    if (!rewardUpdates?.length) return [];
    return rewardUpdates
      .filter((u) => u.rewardPerProposal && u.rewardPerVote)
      .map((u) => {
        let rewardPerAuction = 0;
        if (u.auctionRevenue && u.firstAuctionIdForRevenue && u.lastAuctionIdForRevenue) {
          const numAuctions = Number(u.lastAuctionIdForRevenue) - Number(u.firstAuctionIdForRevenue) + 1;
          if (numAuctions > 0) {
            rewardPerAuction = (weiToEth(u.auctionRevenue) / numAuctions) * 0.05;
          }
        }
        return {
          label: `P${u.firstProposalId}-${u.lastProposalId}`,
          date: shortDate(u.blockTimestamp),
          rewardPerProposal: Number(weiToEth(u.rewardPerProposal!).toFixed(6)),
          rewardPerVote: Number(weiToEth(u.rewardPerVote!).toFixed(8)),
          rewardPerAuction: Number(rewardPerAuction.toFixed(4)),
        };
      });
  }, [rewardUpdates]);

  // Auction revenue bar chart data
  const revenueData = useMemo<RevenueDataPoint[]>(() => {
    if (!rewardUpdates?.length) return [];
    return rewardUpdates
      .filter((u) => u.auctionRevenue)
      .map((u) => ({
        label: `P${u.firstProposalId}-${u.lastProposalId}`,
        date: shortDate(u.blockTimestamp),
        revenue: Number(weiToEth(u.auctionRevenue!).toFixed(4)),
        rewardPerProposal: Number(weiToEth(u.rewardPerProposal || '0').toFixed(6)),
      }));
  }, [rewardUpdates]);

  // The cutoff proposal ID: proposals >= this are unrewarded (current period)
  const lastRewardedProposalId = useMemo(() => {
    if (nextProposalIdToReward != null) {
      return Number(nextProposalIdToReward) - 1;
    }
    if (rewardUpdates?.length) {
      const lastUpdate = rewardUpdates[rewardUpdates.length - 1];
      if (lastUpdate?.lastProposalId) return Number(lastUpdate.lastProposalId);
    }
    return 0;
  }, [nextProposalIdToReward, rewardUpdates]);

  // Partition proposals into current period (unrewarded) and previously rewarded
  const { currentPeriodProposals, rewardedProposals } = useMemo(() => {
    if (!proposals?.length) return { currentPeriodProposals: [] as Proposal[], rewardedProposals: [] as Proposal[] };
    const current: Proposal[] = [];
    const rewarded: Proposal[] = [];
    for (const p of proposals) {
      if (Number(p.id) > lastRewardedProposalId) {
        current.push(p);
      } else {
        rewarded.push(p);
      }
    }
    return { currentPeriodProposals: current, rewardedProposals: rewarded };
  }, [proposals, lastRewardedProposalId]);

  // Eligibility check for a proposal
  const getEligibility = useCallback((proposal: { clientId?: number; forVotes: string; quorumVotes: string; status: string }) => {
    const isCancelled = ['CANCELLED', 'VETOED'].includes(proposal.status);
    if (isCancelled) return 'ineligible' as const;
    if (proposal.clientId == null) return 'ineligible' as const;
    const forVotes = Number(proposal.forVotes);
    const quorum = Number(proposal.quorumVotes) || 1;
    // If quorum is already met, mark eligible even if voting is still live
    if (forVotes >= quorum) return 'eligible' as const;
    const isFinalized = ['DEFEATED', 'SUCCEEDED', 'QUEUED', 'EXECUTED', 'EXPIRED'].includes(proposal.status);
    if (!isFinalized) return 'pending' as const;
    return 'ineligible' as const;
  }, []);

  // Votes by client distribution — current cycle only (from Ponder cycle-votes API)
  const votesByClient = useMemo<DistributionItem[]>(() => {
    if (!cycleVotes?.length) return [];
    const total = cycleVotes.reduce((sum, c) => sum + c.voteCount, 0);
    if (!total) return [];
    return cycleVotes
      .filter((c) => c.voteCount > 0)
      .sort((a, b) => b.voteCount - a.voteCount)
      .map((c) => ({
        clientId: c.clientId,
        name: getClientName(c.clientId) || c.name || `Client ${c.clientId}`,
        count: c.voteCount,
        pct: (c.voteCount / total) * 100,
        color: CHART_COLORS[c.clientId % CHART_COLORS.length],
      }));
  }, [cycleVotes]);

  // Proposals by client distribution — current cycle eligible only
  const proposalsByClient = useMemo<DistributionItem[]>(() => {
    if (!currentPeriodProposals.length) return [];
    // Only count eligible proposals (quorum met, has client, not cancelled)
    const eligible = currentPeriodProposals.filter((p) => getEligibility(p) === 'eligible');
    if (!eligible.length) return [];
    // Group by clientId
    const countMap = new Map<number, number>();
    for (const p of eligible) {
      if (p.clientId != null) {
        countMap.set(p.clientId, (countMap.get(p.clientId) ?? 0) + 1);
      }
    }
    const total = Array.from(countMap.values()).reduce((s, v) => s + v, 0);
    if (!total) return [];
    return Array.from(countMap.entries())
      .sort((a, b) => b[1] - a[1])
      .map(([clientId, count]) => ({
        clientId,
        name: getClientName(clientId) || `Client ${clientId}`,
        count,
        pct: (count / total) * 100,
        color: CHART_COLORS[clientId % CHART_COLORS.length],
      }));
  }, [currentPeriodProposals, getEligibility]);

  // Eligible count for current period
  const eligibleCount = useMemo(() => {
    let eligible = 0;
    let withClient = 0;
    for (const p of currentPeriodProposals) {
      if (p.clientId != null) withClient++;
      const status = getEligibility(p);
      if (status === 'eligible') eligible++;
    }
    return { eligible, withClient, total: currentPeriodProposals.length };
  }, [currentPeriodProposals, getEligibility]);

  // Per-proposal client breakdown with estimated rewards
  const proposalBreakdowns = useMemo<Map<number, ProposalBreakdownEntry[]>>(() => {
    const map = new Map<number, ProposalBreakdownEntry[]>();
    if (!votesByProposal?.length || !pendingRevenue || !proposalRewardParams) return map;

    // Compute reward pools from on-chain params
    const revenueWei = (pendingRevenue as [bigint, bigint])[0];
    const revenueEth = weiToEth(revenueWei.toString());
    const proposalPool = revenueEth * Number(proposalRewardParams.proposalRewardBps) / 10000;
    const votePool = revenueEth * Number(proposalRewardParams.votingRewardBps) / 10000;

    // Count eligible proposals and total eligible votes
    const eligibleProps = currentPeriodProposals.filter((p) => getEligibility(p) === 'eligible');
    const eligiblePropIds = new Set(eligibleProps.map((p) => Number(p.id)));
    const rewardPerProposal = eligibleProps.length > 0 ? proposalPool / eligibleProps.length : 0;

    // Total eligible votes across all eligible proposals
    const totalEligibleVotes = votesByProposal
      .filter((v) => eligiblePropIds.has(v.proposalId))
      .reduce((sum, v) => sum + v.voteCount, 0);
    const rewardPerVote = totalEligibleVotes > 0 ? votePool / totalEligibleVotes : 0;

    // Build per-proposal breakdown
    for (const propId of eligiblePropIds) {
      const proposal = eligibleProps.find((p) => Number(p.id) === propId);
      if (!proposal) continue;

      const propVotes = votesByProposal.filter((v) => v.proposalId === propId);
      const entries: ProposalBreakdownEntry[] = [];

      // Track which client IDs we've seen (for merging proposer + voter)
      const clientMap = new Map<number, ProposalBreakdownEntry>();

      // Add voting clients
      for (const v of propVotes) {
        clientMap.set(v.clientId, {
          clientId: v.clientId,
          name: getClientName(v.clientId) || v.name || `Client ${v.clientId}`,
          voteCount: v.voteCount,
          estimatedVoteReward: v.voteCount * rewardPerVote,
          isProposer: v.clientId === proposal.clientId,
          estimatedProposalReward: v.clientId === proposal.clientId ? rewardPerProposal : 0,
        });
      }

      // Ensure the proposing client is included even if they didn't vote
      if (proposal.clientId != null && !clientMap.has(proposal.clientId)) {
        clientMap.set(proposal.clientId, {
          clientId: proposal.clientId,
          name: getClientName(proposal.clientId) || `Client ${proposal.clientId}`,
          voteCount: 0,
          estimatedVoteReward: 0,
          isProposer: true,
          estimatedProposalReward: rewardPerProposal,
        });
      }

      // Sort: proposer first, then by vote count desc
      const sorted = Array.from(clientMap.values()).sort((a, b) => {
        if (a.isProposer !== b.isProposer) return a.isProposer ? -1 : 1;
        return b.voteCount - a.voteCount;
      });

      map.set(propId, sorted);
    }

    return map;
  }, [votesByProposal, pendingRevenue, proposalRewardParams, currentPeriodProposals, getEligibility]);

  return {
    totals,
    getSortedClients,
    rewardEconData,
    revenueData,
    votesByClient,
    proposalsByClient,
    lastRewardedProposalId,
    currentPeriodProposals,
    rewardedProposals,
    getEligibility,
    eligibleCount,
    proposalBreakdowns,
  };
}
