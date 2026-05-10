/**
 * Live NounV2 auction (polled every 12s) + auction-house parameters.
 */

'use client';

import { useReadContract } from 'wagmi';
import { V2_CONTRACTS, V2_CHAIN_ID } from '../contracts';

export interface V2AuctionData {
  nounId: bigint;
  amount: bigint;
  startTime: bigint;
  endTime: bigint;
  bidder: `0x${string}`;
  settled: boolean;
}

export function useV2CurrentAuction(pollInterval: number = 12_000) {
  const query = useReadContract({
    address: V2_CONTRACTS.auctionHouse.address,
    abi: V2_CONTRACTS.auctionHouse.abi,
    functionName: 'auction',
    chainId: V2_CHAIN_ID,
    query: {
      refetchInterval: pollInterval,
      staleTime: 5_000,
    },
  });

  const auction: V2AuctionData | null = query.data
    ? {
        nounId: query.data[0],
        amount: query.data[1],
        startTime: query.data[2],
        endTime: query.data[3],
        bidder: query.data[4],
        settled: query.data[5],
      }
    : null;

  return { auction, ...query };
}

export function useV2AuctionParams() {
  const reserve = useReadContract({
    address: V2_CONTRACTS.auctionHouse.address,
    abi: V2_CONTRACTS.auctionHouse.abi,
    functionName: 'reservePrice',
    chainId: V2_CHAIN_ID,
  });

  const increment = useReadContract({
    address: V2_CONTRACTS.auctionHouse.address,
    abi: V2_CONTRACTS.auctionHouse.abi,
    functionName: 'minBidIncrementPercentage',
    chainId: V2_CHAIN_ID,
  });

  return {
    reservePrice: (reserve.data ?? BigInt(0)) as bigint,
    minBidIncrementPct: increment.data != null ? Number(increment.data) : 2,
    isLoading: reserve.isLoading || increment.isLoading,
  };
}
