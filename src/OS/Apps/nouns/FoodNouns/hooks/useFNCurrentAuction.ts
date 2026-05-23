/**
 * Polls the live Food Nouns auction every 12s.
 */

'use client';

import { useReadContract } from 'wagmi';
import { FN_CONTRACTS, FN_CHAIN_ID } from '../contracts';

export interface FNAuctionData {
  nounId: bigint;
  amount: bigint;
  startTime: bigint;
  endTime: bigint;
  bidder: `0x${string}`;
  settled: boolean;
}

export function useFNCurrentAuction(pollInterval: number = 12_000) {
  const query = useReadContract({
    address: FN_CONTRACTS.auctionHouse.address,
    abi: FN_CONTRACTS.auctionHouse.abi,
    functionName: 'auction',
    chainId: FN_CHAIN_ID,
    query: {
      refetchInterval: pollInterval,
      staleTime: 5_000,
    },
  });

  const auction: FNAuctionData | null = query.data
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

export function useFNAuctionParams() {
  const reserve = useReadContract({
    address: FN_CONTRACTS.auctionHouse.address,
    abi: FN_CONTRACTS.auctionHouse.abi,
    functionName: 'reservePrice',
    chainId: FN_CHAIN_ID,
  });

  const increment = useReadContract({
    address: FN_CONTRACTS.auctionHouse.address,
    abi: FN_CONTRACTS.auctionHouse.abi,
    functionName: 'minBidIncrementPercentage',
    chainId: FN_CHAIN_ID,
  });

  return {
    reservePrice: (reserve.data ?? BigInt(0)) as bigint,
    minBidIncrementPct: increment.data != null ? Number(increment.data) : 5,
    isLoading: reserve.isLoading || increment.isLoading,
  };
}
