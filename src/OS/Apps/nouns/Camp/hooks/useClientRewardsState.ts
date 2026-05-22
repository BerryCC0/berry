/**
 * useClientRewardsState
 * Multicall hook that snapshots the ClientRewards contract's view state so
 * admin-rewards-* templates can render context above the form (current
 * values, enable/disable warnings, etc.).
 *
 * All reads in one round-trip via wagmi's `useReadContracts` multicall.
 * Cached for 60 s — these values change infrequently relative to how often
 * users browse the form.
 */

'use client';

import { useReadContracts } from 'wagmi';
import { type Address } from 'viem';
import { CLIENT_REWARDS_ADDRESS } from '../utils/actionTemplates/constants';
import { ClientRewardsABI } from '@/app/lib/nouns/abis/ClientRewards';

export interface AuctionRewardParams {
  auctionRewardBps: number;
  minimumAuctionsBetweenUpdates: number;
}

export interface ProposalRewardParams {
  minimumRewardPeriod: number;
  numProposalsEnoughForReward: number;
  proposalRewardBps: number;
  votingRewardBps: number;
  proposalEligibilityQuorumBps: number;
}

export interface ClientRewardsState {
  admin: Address | undefined;
  owner: Address | undefined;
  descriptor: Address | undefined;
  ethToken: Address | undefined;
  nounsDAO: Address | undefined;
  paused: boolean | undefined;
  auctionRewardsEnabled: boolean | undefined;
  proposalRewardsEnabled: boolean | undefined;
  auctionRewardParams: AuctionRewardParams | undefined;
  proposalRewardParams: ProposalRewardParams | undefined;
  nextTokenId: number | undefined;
  isLoading: boolean;
  isError: boolean;
}

export function useClientRewardsState(): ClientRewardsState {
  const { data, isLoading, isError } = useReadContracts({
    contracts: [
      { address: CLIENT_REWARDS_ADDRESS, abi: ClientRewardsABI, functionName: 'admin' as const },
      { address: CLIENT_REWARDS_ADDRESS, abi: ClientRewardsABI, functionName: 'owner' as const },
      { address: CLIENT_REWARDS_ADDRESS, abi: ClientRewardsABI, functionName: 'descriptor' as const },
      { address: CLIENT_REWARDS_ADDRESS, abi: ClientRewardsABI, functionName: 'ethToken' as const },
      { address: CLIENT_REWARDS_ADDRESS, abi: ClientRewardsABI, functionName: 'nounsDAO' as const },
      { address: CLIENT_REWARDS_ADDRESS, abi: ClientRewardsABI, functionName: 'paused' as const },
      { address: CLIENT_REWARDS_ADDRESS, abi: ClientRewardsABI, functionName: 'auctionRewardsEnabled' as const },
      { address: CLIENT_REWARDS_ADDRESS, abi: ClientRewardsABI, functionName: 'proposalRewardsEnabled' as const },
      { address: CLIENT_REWARDS_ADDRESS, abi: ClientRewardsABI, functionName: 'getAuctionRewardParams' as const },
      { address: CLIENT_REWARDS_ADDRESS, abi: ClientRewardsABI, functionName: 'getProposalRewardParams' as const },
      { address: CLIENT_REWARDS_ADDRESS, abi: ClientRewardsABI, functionName: 'nextTokenId' as const },
    ],
    query: { staleTime: 60 * 1000 },
  });

  const ok = (i: number) => data?.[i]?.status === 'success';
  const result = <T,>(i: number) =>
    ok(i) ? (data![i].result as T) : undefined;

  const auctionParamsRaw = ok(8)
    ? (data![8].result as {
        auctionRewardBps: number;
        minimumAuctionsBetweenUpdates: number;
      })
    : undefined;
  const proposalParamsRaw = ok(9)
    ? (data![9].result as {
        minimumRewardPeriod: number;
        numProposalsEnoughForReward: number;
        proposalRewardBps: number;
        votingRewardBps: number;
        proposalEligibilityQuorumBps: number;
      })
    : undefined;

  return {
    admin: result<Address>(0),
    owner: result<Address>(1),
    descriptor: result<Address>(2),
    ethToken: result<Address>(3),
    nounsDAO: result<Address>(4),
    paused: result<boolean>(5),
    auctionRewardsEnabled: result<boolean>(6),
    proposalRewardsEnabled: result<boolean>(7),
    auctionRewardParams: auctionParamsRaw
      ? {
          auctionRewardBps: Number(auctionParamsRaw.auctionRewardBps),
          minimumAuctionsBetweenUpdates: Number(
            auctionParamsRaw.minimumAuctionsBetweenUpdates,
          ),
        }
      : undefined,
    proposalRewardParams: proposalParamsRaw
      ? {
          minimumRewardPeriod: Number(proposalParamsRaw.minimumRewardPeriod),
          numProposalsEnoughForReward: Number(
            proposalParamsRaw.numProposalsEnoughForReward,
          ),
          proposalRewardBps: Number(proposalParamsRaw.proposalRewardBps),
          votingRewardBps: Number(proposalParamsRaw.votingRewardBps),
          proposalEligibilityQuorumBps: Number(
            proposalParamsRaw.proposalEligibilityQuorumBps,
          ),
        }
      : undefined,
    nextTokenId: result<number>(10),
    isLoading,
    isError,
  };
}
