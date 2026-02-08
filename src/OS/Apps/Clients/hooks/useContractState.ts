/**
 * Consolidated on-chain contract reads for Client Incentives
 */

'use client';

import { useReadContract } from 'wagmi';
import { ERC20ABI } from '@/app/lib/nouns/contracts';
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

  // Read pending auction revenue since the last ProposalRewardsUpdated
  const currentTimestamp = BigInt(Math.floor(Date.now() / 1000));
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
  };
}
