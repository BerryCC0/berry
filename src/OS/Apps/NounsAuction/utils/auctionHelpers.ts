/**
 * Auction Helper Functions
 * Business logic for auction operations
 */

import { formatEther } from 'viem';

/**
 * Format countdown timer
 */
export function formatCountdown(secondsRemaining: number): string {
  if (secondsRemaining <= 0) return 'Ended';
  
  const hours = Math.floor(secondsRemaining / 3600);
  const minutes = Math.floor((secondsRemaining % 3600) / 60);
  const seconds = Math.floor(secondsRemaining % 60);
  
  return `${hours}h ${minutes}m ${seconds}s`;
}

/**
 * Format timestamp to readable date
 */
export function formatTimestamp(timestamp: string | number): string {
  const ts = typeof timestamp === 'string' ? Number(timestamp) : timestamp;
  const date = new Date(ts * 1000);
  return date.toLocaleDateString('en-US', { 
    month: 'long', 
    day: 'numeric', 
    year: 'numeric' 
  });
}

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
 * Check if viewing a Nounder Noun (every 10th Noun, excluding 0)
 */
export function isNounderNoun(nounId: string | number): boolean {
  const id = typeof nounId === 'string' ? Number(nounId) : nounId;
  return id % 10 === 0 && id !== 0;
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

/**
 * Truncate address for display
 */
export function truncateAddress(address: string): string {
  if (!address) return '';
  return `${address.slice(0, 6)}...${address.slice(-4)}`;
}

