/**
 * Update Rewards Hooks
 * Simulate + write pattern for updateRewardsForAuctions and updateRewardsForProposalWritingAndVoting
 */

'use client';

import { useMemo } from 'react';
import { useSimulateContract, useWriteContract, useWaitForTransactionReceipt, useReadContract, useAccount } from 'wagmi';
import { ClientRewardsABI } from '@/app/lib/nouns/abis/ClientRewards';
import { useCurrentAuction } from '@/app/lib/nouns/hooks/useCurrentAuction';
import { CLIENT_REWARDS_ADDRESS } from '../constants';
import type { Proposal } from '@/OS/Apps/Camp/types';

// ============================================================================
// useUpdateAuctionRewards
// ============================================================================

export function useUpdateAuctionRewards() {
  const { address } = useAccount();
  const { auction } = useCurrentAuction();

  // Latest settled noun ID = current auction nounId - 1
  // (the current noun is still being auctioned)
  const lastNounId = useMemo(() => {
    if (!auction) return undefined;
    const current = Number(auction.nounId);
    // If the current auction is settled, it IS the latest settled noun
    // Otherwise, the previous noun is the latest settled
    return auction.settled ? current : current - 1;
  }, [auction]);

  // Simulate the transaction to check if it would succeed
  const {
    data: simulateData,
    error: simulateError,
    isLoading: isSimulating,
  } = useSimulateContract({
    address: CLIENT_REWARDS_ADDRESS,
    abi: ClientRewardsABI,
    functionName: 'updateRewardsForAuctions',
    args: lastNounId != null ? [lastNounId] : undefined,
    query: { enabled: lastNounId != null && !!address },
  });

  // Write contract
  const {
    writeContract,
    data: hash,
    isPending,
    error: writeError,
    reset,
  } = useWriteContract();

  // Wait for receipt
  const {
    isLoading: isConfirming,
    isSuccess,
  } = useWaitForTransactionReceipt({ hash });

  const canExecute = !!simulateData?.request && !simulateError;

  const execute = () => {
    if (simulateData?.request) {
      writeContract(simulateData.request);
    }
  };

  return {
    execute,
    isPending,
    isConfirming,
    isSuccess,
    canExecute,
    isSimulating,
    error: writeError || simulateError,
    lastNounId,
    hash,
    reset,
  };
}

// ============================================================================
// useUpdateProposalRewards
// ============================================================================

interface UseUpdateProposalRewardsArgs {
  currentPeriodProposals: Proposal[];
  getEligibility: (p: { clientId?: number; forVotes: string; quorumVotes: string; status: string }) => 'eligible' | 'pending' | 'ineligible';
}

export function useUpdateProposalRewards({ currentPeriodProposals, getEligibility }: UseUpdateProposalRewardsArgs) {
  const { address } = useAccount();

  // Derive lastProposalId: latest proposal whose voting has ended
  // Voting has ended if the proposal is not ACTIVE, PENDING, or UPDATABLE
  const lastProposalId = useMemo(() => {
    const endedStatuses = ['SUCCEEDED', 'DEFEATED', 'QUEUED', 'EXECUTED', 'EXPIRED', 'CANCELLED', 'VETOED'];
    const ended = currentPeriodProposals.filter((p) => endedStatuses.includes(p.status));
    if (!ended.length) return undefined;
    return Math.max(...ended.map((p) => Number(p.id)));
  }, [currentPeriodProposals]);

  // Read getVotingClientIds(lastProposalId) from contract
  const { data: votingClientIds } = useReadContract({
    address: CLIENT_REWARDS_ADDRESS,
    abi: ClientRewardsABI,
    functionName: 'getVotingClientIds',
    args: lastProposalId != null ? [lastProposalId] : undefined,
    query: { enabled: lastProposalId != null },
  });

  // Simulate the transaction
  const {
    data: simulateData,
    error: simulateError,
    isLoading: isSimulating,
  } = useSimulateContract({
    address: CLIENT_REWARDS_ADDRESS,
    abi: ClientRewardsABI,
    functionName: 'updateRewardsForProposalWritingAndVoting',
    args: lastProposalId != null && votingClientIds != null
      ? [lastProposalId, votingClientIds as readonly number[]]
      : undefined,
    query: {
      enabled: lastProposalId != null && votingClientIds != null && !!address,
    },
  });

  // Write contract
  const {
    writeContract,
    data: hash,
    isPending,
    error: writeError,
    reset,
  } = useWriteContract();

  // Wait for receipt
  const {
    isLoading: isConfirming,
    isSuccess,
  } = useWaitForTransactionReceipt({ hash });

  const canExecute = !!simulateData?.request && !simulateError;

  const execute = () => {
    if (simulateData?.request) {
      writeContract(simulateData.request);
    }
  };

  return {
    execute,
    isPending,
    isConfirming,
    isSuccess,
    canExecute,
    isSimulating,
    error: writeError || simulateError,
    lastProposalId,
    hash,
    reset,
  };
}
