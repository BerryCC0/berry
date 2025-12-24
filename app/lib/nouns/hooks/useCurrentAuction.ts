/**
 * Current Auction Hook
 * Fetches current auction state from contract with real-time updates
 */

import { useReadContract, useWatchContractEvent } from 'wagmi';
import { NOUNS_CONTRACTS } from '../contracts';

export interface AuctionData {
  nounId: bigint;
  amount: bigint;
  startTime: bigint;
  endTime: bigint;
  bidder: `0x${string}`;
  settled: boolean;
}

/**
 * Get the current auction from the Auction House contract
 * Automatically refetches when a new bid is placed
 */
export function useCurrentAuction() {
  const { data, refetch, isLoading, error } = useReadContract({
    address: NOUNS_CONTRACTS.auctionHouse.address,
    abi: NOUNS_CONTRACTS.auctionHouse.abi,
    functionName: 'auction',
  });

  // Refetch on new bid
  useWatchContractEvent({
    address: NOUNS_CONTRACTS.auctionHouse.address,
    abi: NOUNS_CONTRACTS.auctionHouse.abi,
    eventName: 'AuctionBid',
    onLogs: () => {
      refetch();
    },
  });

  // Refetch when auction is settled
  useWatchContractEvent({
    address: NOUNS_CONTRACTS.auctionHouse.address,
    abi: NOUNS_CONTRACTS.auctionHouse.abi,
    eventName: 'AuctionSettled',
    onLogs: () => {
      refetch();
    },
  });

  // Transform the tuple result to a typed object
  const auction: AuctionData | null = data
    ? {
        nounId: data[0],
        amount: data[1],
        startTime: data[2],
        endTime: data[3],
        bidder: data[4],
        settled: data[5],
      }
    : null;

  return {
    auction,
    isLoading,
    error,
    refetch,
  };
}

/**
 * Calculate time remaining in auction
 */
export function useAuctionTimeRemaining(endTime: bigint | undefined) {
  const now = Math.floor(Date.now() / 1000);
  
  if (!endTime) return { timeRemaining: 0, isEnded: true };
  
  const endTimeSec = Number(endTime);
  const timeRemaining = Math.max(0, endTimeSec - now);
  
  return {
    timeRemaining,
    isEnded: timeRemaining === 0,
    hours: Math.floor(timeRemaining / 3600),
    minutes: Math.floor((timeRemaining % 3600) / 60),
    seconds: timeRemaining % 60,
  };
}

