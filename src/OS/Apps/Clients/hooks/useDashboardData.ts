/**
 * Dashboard Data Orchestrator Hook
 * Composes all data-fetching hooks and derived computations
 * so the Clients component only deals with presentation.
 */

'use client';

import { useMemo, useState, useEffect } from 'react';
import { formatEther } from 'viem';
import { useClients, useRewardUpdates, useCycleVotes, useCycleAuctions } from './useClientIncentives';
import { useContractState } from './useContractState';
import { useChartData } from './useChartData';
import { useClientMetadata } from './useClientMetadata';
import { useProposals } from '@/OS/Apps/Camp/hooks';
import { CHART_COLORS } from '../constants';
import { weiToEth } from '../utils';
import type { CycleRewardEntry, CycleProgress } from '../types';

export function useDashboardData() {
  // Core data
  const { data: clients, isLoading: clientsLoading } = useClients();
  const { data: rewardUpdates } = useRewardUpdates('PROPOSAL');
  const { data: proposals } = useProposals(50, 'all', 'newest');

  // On-chain contract state
  const {
    contractWethBalance,
    proposalRewardParams,
    nextProposalIdToReward,
    nextAuctionIdForRevenue,
    lastProposalRewardsUpdate,
    pendingRevenue,
  } = useContractState();

  // Compute eligible proposal IDs for current cycle vote fetching
  const eligibleProposalIds = useMemo(() => {
    if (!proposals?.length || nextProposalIdToReward == null) return [];
    const cutoff = Number(nextProposalIdToReward) - 1;
    return proposals
      .filter((p) => {
        if (Number(p.id) <= cutoff) return false;
        if (p.clientId == null) return false;
        if (['CANCELLED', 'VETOED'].includes(p.status)) return false;
        const forVotes = Number(p.forVotes);
        const quorum = Number(p.quorumVotes) || 1;
        return forVotes >= quorum;
      })
      .map((p) => Number(p.id));
  }, [proposals, nextProposalIdToReward]);

  // Fetch vote weight per client for current cycle eligible proposals
  const { data: cycleVotesData } = useCycleVotes(eligibleProposalIds);

  // Fetch current cycle auction data
  const { data: cycleAuctionsData } = useCycleAuctions(
    nextAuctionIdForRevenue != null ? Number(nextAuctionIdForRevenue) : undefined,
  );

  // Fetch client metadata (favicons)
  const { data: clientMetadata } = useClientMetadata(clients);

  // Computed chart & table data
  const chartData = useChartData(
    clients, rewardUpdates, proposals, nextProposalIdToReward,
    cycleVotesData?.votes, cycleVotesData?.votesByProposal,
    pendingRevenue, proposalRewardParams,
  );

  // Convert BigInt contract values to serializable numbers for child components
  const contractWethBalanceEth = useMemo(() => {
    if (contractWethBalance == null) return null;
    return Number(formatEther(contractWethBalance as bigint));
  }, [contractWethBalance]);

  const quorumBps = useMemo(() => {
    if (!proposalRewardParams) return null;
    return Number(proposalRewardParams.proposalEligibilityQuorumBps);
  }, [proposalRewardParams]);

  const pendingRevenueEth = useMemo(() => {
    if (pendingRevenue == null) return null;
    return weiToEth((pendingRevenue as [bigint, bigint])[0].toString());
  }, [pendingRevenue]);

  // Aggregate estimated rewards per client across all eligible proposals
  const cycleRewardsByClient = useMemo<CycleRewardEntry[]>(() => {
    if (!chartData.proposalBreakdowns.size) return [];
    const totals = new Map<number, { name: string; reward: number; color: string }>();
    for (const entries of chartData.proposalBreakdowns.values()) {
      for (const e of entries) {
        const prev = totals.get(e.clientId);
        const reward = e.estimatedProposalReward + e.estimatedVoteReward;
        if (prev) {
          prev.reward += reward;
        } else {
          totals.set(e.clientId, {
            name: e.name,
            reward,
            color: CHART_COLORS[e.clientId % CHART_COLORS.length],
          });
        }
      }
    }
    return Array.from(totals.entries())
      .map(([clientId, v]) => ({ clientId, ...v }))
      .sort((a, b) => b.reward - a.reward);
  }, [chartData.proposalBreakdowns]);

  // Live-updating clock for cycle countdown (ticks every 60s)
  const [now, setNow] = useState(() => Math.floor(Date.now() / 1000));
  useEffect(() => {
    const id = setInterval(() => setNow(Math.floor(Date.now() / 1000)), 60_000);
    return () => clearInterval(id);
  }, []);

  // Find the creation time of the last eligible proposal in the current cycle
  const lastEligibleProposalTimestamp = useMemo(() => {
    if (!chartData.currentPeriodProposals.length) return null;
    const eligible = chartData.currentPeriodProposals.filter(
      (p) => chartData.getEligibility(p) === 'eligible',
    );
    if (!eligible.length) return null;
    // Proposals are sorted newest-first; take the latest creation time
    return Math.max(...eligible.map((p) => Number(p.createdTimestamp)));
  }, [chartData.currentPeriodProposals, chartData.getEligibility]);

  // Compute cycle progress
  // Time condition: creationTime(lastEligibleProposal) - lastUpdate >= minimumRewardPeriod
  // NOT now - lastUpdate. Distribution also requires at least 1 eligible proposal.
  const cycleProgress = useMemo<CycleProgress | null>(() => {
    if (!proposalRewardParams || lastProposalRewardsUpdate == null) return null;

    const minimumRewardPeriod = Number(proposalRewardParams.minimumRewardPeriod);
    const numProposalsEnoughForReward = Number(proposalRewardParams.numProposalsEnoughForReward);
    const lastUpdateTimestamp = Number(lastProposalRewardsUpdate);
    const eligibleCount = chartData.eligibleCount.eligible;

    // Proposal count condition
    const proposalConditionMet = eligibleCount >= numProposalsEnoughForReward;

    // Time condition is checked against the last eligible proposal's creation time, not now.
    // If there are no eligible proposals yet, time condition cannot be evaluated.
    let timeConditionMet = false;
    let timeElapsed = now - lastUpdateTimestamp; // wall-clock elapsed (for display)
    if (lastEligibleProposalTimestamp != null) {
      const periodElapsed = lastEligibleProposalTimestamp - lastUpdateTimestamp;
      timeConditionMet = periodElapsed >= minimumRewardPeriod;
    }

    // Time remaining: how much longer from now until minimumRewardPeriod is reached
    // (i.e. when a newly-created proposal would satisfy the time condition)
    const deadline = lastUpdateTimestamp + minimumRewardPeriod;
    const timeRemaining = now >= deadline ? null : deadline - now;

    // Can only distribute if there are eligible proposals AND either condition is met
    const canDistribute = eligibleCount > 0 && (timeConditionMet || proposalConditionMet);

    return {
      minimumRewardPeriod,
      numProposalsEnoughForReward,
      lastUpdateTimestamp,
      timeElapsed,
      timeRemaining,
      proposalConditionMet,
      timeConditionMet,
      canDistribute,
    };
  }, [proposalRewardParams, lastProposalRewardsUpdate, now, chartData.eligibleCount.eligible, lastEligibleProposalTimestamp]);

  return {
    // Loading / data
    clients,
    clientsLoading,
    rewardUpdates,

    // Contract state (serializable — no BigInts)
    contractWethBalanceEth,
    quorumBps,
    pendingRevenueEth,

    // Client metadata
    clientMetadata,

    // Cycle data
    cycleAuctionsData,
    cycleRewardsByClient,
    cycleProgress,

    // Chart data (spread all computed values)
    ...chartData,
  };
}
