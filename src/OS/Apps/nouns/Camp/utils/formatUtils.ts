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
 * Compact countdown with a prefix: "Ends in 2h 15m", "Starts in 3d 5h",
 * "Ends in 12m". Returns "Ended" when the timestamp is in the past.
 */
export function formatRelativeTimeCompact(timestamp: number, prefix: string): string {
  const diff = timestamp - Math.floor(Date.now() / 1000);
  if (diff <= 0) return 'Ended';

  const days = Math.floor(diff / 86400);
  const hours = Math.floor((diff % 86400) / 3600);
  const minutes = Math.floor((diff % 3600) / 60);

  let body: string;
  if (days > 0) body = hours > 0 ? `${days}d ${hours}h` : `${days}d`;
  else if (hours > 0) body = minutes > 0 ? `${hours}h ${minutes}m` : `${hours}h`;
  else body = `${Math.max(minutes, 1)}m`;

  return `${prefix} ${body}`;
}

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

/**
 * Render a unix timestamp as a compact wall-clock string in the user's
 * locale and timezone. Adapts: time only if same day, weekday + time if
 * within a week, dated otherwise. Pairs with `formatRelativeTime` so a
 * "Ends in 2h" countdown can be shown alongside a concrete "3:45 PM".
 */
export function formatAbsoluteTime(unixSeconds: number): string {
  const target = new Date(unixSeconds * 1000);
  const now = new Date();
  const time = target.toLocaleTimeString(undefined, { hour: 'numeric', minute: '2-digit' });

  const sameDay =
    target.getFullYear() === now.getFullYear() &&
    target.getMonth() === now.getMonth() &&
    target.getDate() === now.getDate();
  if (sameDay) return time;

  const diffMs = Math.abs(target.getTime() - now.getTime());
  const ONE_WEEK_MS = 7 * 24 * 60 * 60 * 1000;
  if (diffMs < ONE_WEEK_MS) {
    const weekday = target.toLocaleDateString(undefined, { weekday: 'short' });
    return `${weekday} ${time}`;
  }

  const sameYear = target.getFullYear() === now.getFullYear();
  const date = target.toLocaleDateString(
    undefined,
    sameYear
      ? { month: 'short', day: 'numeric' }
      : { year: 'numeric', month: 'short', day: 'numeric' },
  );
  return `${date} ${time}`;
}
