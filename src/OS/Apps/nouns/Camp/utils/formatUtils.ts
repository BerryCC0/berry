/**
 * Format Utilities
 * Shared formatting helpers for Camp components
 */

// Re-export shared formatting utilities
export { timeAgo as formatTimeAgo, formatRelativeTime } from '@/shared/format';
export { formatAddress, truncateAddress } from '@/shared/format';

/**
 * Format a candidate slug into a readable title
 * e.g., "the-great-delegation---case-study-(part-ii-of-ii)" → "The Great Delegation - Case Study (Part II of II)"
 */
export function formatSlugToTitle(slug: string): string {
  return slug
    // Replace multiple hyphens with a single dash surrounded by spaces
    .replace(/---+/g, ' - ')
    // Replace remaining hyphens with spaces
    .replace(/-/g, ' ')
    // Capitalize first letter of each word
    .replace(/\b\w/g, c => c.toUpperCase())
    // Fix common patterns
    .replace(/\bIi\b/g, 'II')
    .replace(/\bIii\b/g, 'III')
    .replace(/\bIv\b/g, 'IV')
    .replace(/\bOf\b/g, 'of')
    .replace(/\bThe\b/g, 'the')
    .replace(/\bA\b/g, 'a')
    .replace(/\bAn\b/g, 'an')
    .replace(/\bAnd\b/g, 'and')
    .replace(/\bFor\b/g, 'for')
    .replace(/\bTo\b/g, 'to')
    // Always capitalize first character
    .replace(/^./, c => c.toUpperCase());
}

import { SECONDS_PER_BLOCK } from './proposalStatus';

/**
 * Calculate end time from endBlock.
 */
export function estimateEndTime(endBlock: string, currentBlock: number): number {
  const blocksRemaining = Number(endBlock) - currentBlock;
  const secondsRemaining = blocksRemaining * SECONDS_PER_BLOCK;
  return Math.floor(Date.now() / 1000) + secondsRemaining;
}

/**
 * Calculate start time from startBlock.
 */
export function estimateStartTime(startBlock: string, currentBlock: number): number {
  const blocksUntilStart = Number(startBlock) - currentBlock;
  const secondsUntilStart = blocksUntilStart * SECONDS_PER_BLOCK;
  return Math.floor(Date.now() / 1000) + secondsUntilStart;
}
