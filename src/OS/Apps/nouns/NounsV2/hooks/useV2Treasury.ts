/**
 * NounV2 treasury — ETH balance + auction-house beneficiary + governor params.
 */

'use client';

import { useQuery } from '@tanstack/react-query';
import { usePublicClient, useReadContract } from 'wagmi';
import { V2_ADDRESSES, V2_CONTRACTS, V2_CHAIN_ID } from '../contracts';

export function useV2TreasuryBalance() {
  const publicClient = usePublicClient({ chainId: V2_CHAIN_ID });

  return useQuery<bigint>({
    queryKey: ['v2', 'treasury', 'balance'],
    enabled: !!publicClient,
    staleTime: 30_000,
    queryFn: async () => {
      if (!publicClient) return BigInt(0);
      return publicClient.getBalance({ address: V2_ADDRESSES.treasury });
    },
  });
}

export function useV2Beneficiary() {
  return useReadContract({
    address: V2_CONTRACTS.auctionHouse.address,
    abi: V2_CONTRACTS.auctionHouse.abi,
    functionName: 'beneficiary',
    chainId: V2_CHAIN_ID,
  });
}

/** Governor constants — fetched once and cached. */
export function useV2GovernorParams() {
  const votingPeriod = useReadContract({
    address: V2_CONTRACTS.treasury.address,
    abi: V2_CONTRACTS.treasury.abi,
    functionName: 'VOTING_PERIOD',
    chainId: V2_CHAIN_ID,
    query: { staleTime: Infinity, gcTime: Infinity },
  });
  const timelockDelay = useReadContract({
    address: V2_CONTRACTS.treasury.address,
    abi: V2_CONTRACTS.treasury.abi,
    functionName: 'TIMELOCK_DELAY',
    chainId: V2_CHAIN_ID,
    query: { staleTime: Infinity, gcTime: Infinity },
  });
  const gracePeriod = useReadContract({
    address: V2_CONTRACTS.treasury.address,
    abi: V2_CONTRACTS.treasury.abi,
    functionName: 'GRACE_PERIOD',
    chainId: V2_CHAIN_ID,
    query: { staleTime: Infinity, gcTime: Infinity },
  });
  const proposalThreshold = useReadContract({
    address: V2_CONTRACTS.treasury.address,
    abi: V2_CONTRACTS.treasury.abi,
    functionName: 'PROPOSAL_THRESHOLD',
    chainId: V2_CHAIN_ID,
    query: { staleTime: Infinity, gcTime: Infinity },
  });

  return {
    votingPeriodBlocks: (votingPeriod.data ?? BigInt(3600)) as bigint,
    timelockDelaySec: (timelockDelay.data ?? BigInt(43200)) as bigint,
    gracePeriodSec: (gracePeriod.data ?? BigInt(604800)) as bigint,
    proposalThreshold: (proposalThreshold.data ?? BigInt(1)) as bigint,
    isLoading:
      votingPeriod.isLoading ||
      timelockDelay.isLoading ||
      gracePeriod.isLoading ||
      proposalThreshold.isLoading,
  };
}
