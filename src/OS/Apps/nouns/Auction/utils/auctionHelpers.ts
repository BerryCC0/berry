/**
 * Auction Helper Functions
 * Business logic for auction operations
 */

import { formatEther } from 'viem';

// Re-export shared formatting utilities
export { formatCountdown, formatTimestamp } from '@/shared/format';
export { truncateAddress } from '@/shared/format';

/** Nounders multi-sig wallet. */
export const NOUNDERS_ADDRESS = '0x2573C60a6D127755aA2DC85e342F7da2378a0Cc5' as const;
export const NOUNDERS_ENS = 'nounders.eth' as const;

/**
 * Format current date
 */
export function formatCurrentDate(): string {
  return new Date().toLocaleDateString('en-US', { 
    month: 'long', 
    day: 'numeric', 
    year: 'numeric' 
  });
}

/**
 * Calculate time remaining in seconds
 */
export function getTimeRemaining(endTime: string | number): number {
  const now = Math.floor(Date.now() / 1000);
  const end = typeof endTime === 'string' ? Number(endTime) : endTime;
  return Math.max(0, end - now);
}

/**
 * Check if viewing a Nounder Noun (every 10th Noun, excluding 0).
 * Nounder allocation ended at Noun 1830 — all subsequent nouns are auctioned.
 */
export const LAST_NOUNDER_NOUN_ID = 1830;

export function isNounderNoun(nounId: string | number): boolean {
  const id = typeof nounId === 'string' ? Number(nounId) : nounId;
  return id % 10 === 0 && id !== 0 && id <= LAST_NOUNDER_NOUN_ID;
}

/**
 * Format bid amount from wei to ETH
 */
export function formatBidAmount(amountWei: string | bigint): string {
  const wei = typeof amountWei === 'string' ? BigInt(amountWei) : amountWei;
  return formatEther(wei);
}

/**
 * Get minimum next bid based on current bid and increment percentage
 */
export function getMinimumNextBid(
  currentBidWei: string | bigint, 
  incrementPercentage: number = 5
): bigint {
  const current = typeof currentBidWei === 'string' ? BigInt(currentBidWei) : currentBidWei;
  const increment = (current * BigInt(incrementPercentage)) / BigInt(100);
  return current + increment;
}

/**
 * Check if auction is active (not settled and has time remaining)
 */
export function isAuctionActive(endTime: string | number, settled: boolean): boolean {
  if (settled) return false;
  return getTimeRemaining(endTime) > 0;
}
