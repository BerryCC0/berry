/**
 * Consolidated on-chain contract reads for Client Incentives
 */

'use client';

import { useMemo } from 'react';
import { useReadContract } from 'wagmi';
import { ERC20ABI, NounsDAOABI, NOUNS_ADDRESSES } from '@/app/lib/nouns/contracts';
import { ClientRewardsABI } from '@/app/lib/nouns/abis/ClientRewards';
import { WETH_ADDRESS, CLIENT_REWARDS_ADDRESS } from '../constants';

export function useContractState() {
  // Read WETH balance of the Client Incentives contract
  const { data: contractWethBalance } = useReadContract({
    address: WETH_ADDRESS,
    abi: ERC20ABI,
    functionName: 'balanceOf',
    args: [CLIENT_REWARDS_ADDRESS],
  });

  // Read proposal reward params (proposalEligibilityQuorumBps, etc.)
  const { data: proposalRewardParams } = useReadContract({
    address: CLIENT_REWARDS_ADDRESS,
    abi: ClientRewardsABI,
    functionName: 'getProposalRewardParams',
  });

  // Read the next proposal ID to reward (proposals >= this ID are unrewarded)
  const { data: nextProposalIdToReward } = useReadContract({
    address: CLIENT_REWARDS_ADDRESS,
    abi: ClientRewardsABI,
    functionName: 'nextProposalIdToReward',
  });

  // Read the first auction ID for the current revenue period
  const { data: nextAuctionIdForRevenue } = useReadContract({
    address: CLIENT_REWARDS_ADDRESS,
    abi: ClientRewardsABI,
    functionName: 'nextProposalRewardFirstAuctionId',
  });

  // Read the timestamp of the last proposal rewards update
  const { data: lastProposalRewardsUpdate } = useReadContract({
    address: CLIENT_REWARDS_ADDRESS,
    abi: ClientRewardsABI,
    functionName: 'lastProposalRewardsUpdate',
  });

  // Read the next auction ID to reward (for auction rewards updates)
  const { data: nextAuctionIdToReward } = useReadContract({
    address: CLIENT_REWARDS_ADDRESS,
    abi: ClientRewardsABI,
    functionName: 'nextAuctionIdToReward',
  });

  // Read auction reward params (minimumAuctionsBetweenUpdates, etc.)
  const { data: auctionRewardParams } = useReadContract({
    address: CLIENT_REWARDS_ADDRESS,
    abi: ClientRewardsABI,
    functionName: 'getAuctionRewardParams',
  });

  // Read adjustedTotalSupply from DAO governor (for incentive eligibility threshold)
  const { data: adjustedTotalSupply } = useReadContract({
    address: NOUNS_ADDRESSES.governor,
    abi: NounsDAOABI,
    functionName: 'adjustedTotalSupply',
  });

  // Stabilize timestamp to 60-second granularity so it doesn't change on every render,
  // which would invalidate Wagmi's query key and re-fire the contract call continuously.
  const currentMinute = Math.floor(Date.now() / 60_000);
  const currentTimestamp = useMemo(() => BigInt(currentMinute * 60), [currentMinute]);

  // Read pending auction revenue since the last ProposalRewardsUpdated
  const { data: pendingRevenue } = useReadContract({
    address: CLIENT_REWARDS_ADDRESS,
    abi: ClientRewardsABI,
    functionName: 'getAuctionRevenue',
    args: nextAuctionIdForRevenue != null
      ? [nextAuctionIdForRevenue, currentTimestamp]
      : undefined,
    query: { enabled: nextAuctionIdForRevenue != null },
  });

  return {
    contractWethBalance,
    proposalRewardParams,
    nextProposalIdToReward,
    nextAuctionIdForRevenue,
    lastProposalRewardsUpdate,
    nextAuctionIdToReward,
    auctionRewardParams,
    pendingRevenue,
    adjustedTotalSupply,
  };
}
