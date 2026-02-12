/**
 * Format Utilities
 * Shared formatting helpers for Camp components
 */

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

/**
 * Format relative time (e.g., "Ends in 5 hours", "Starts in 2 days")
 */
export function formatRelativeTime(timestamp: number, prefix: string): string {
  const now = Math.floor(Date.now() / 1000);
  const diff = timestamp - now;
  
  if (diff < 0) {
    return 'Ended';
  }
  
  if (diff < 3600) {
    const mins = Math.floor(diff / 60);
    return `${prefix} ${mins} minute${mins !== 1 ? 's' : ''}`;
  }
  
  if (diff < 86400) {
    const hours = Math.floor(diff / 3600);
    return `${prefix} ${hours} hour${hours !== 1 ? 's' : ''}`;
  }
  
  const days = Math.floor(diff / 86400);
  return `${prefix} ${days} day${days !== 1 ? 's' : ''}`;
}

/**
 * Format a timestamp into a relative "time ago" string
 */
export function formatTimeAgo(timestamp: number): string {
  const now = Date.now() / 1000;
  const diff = now - timestamp;

  // Guard against future timestamps
  if (diff < 0) return 'just now';
  if (diff < 60) return 'just now';
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
  if (diff < 604800) return `${Math.floor(diff / 86400)}d ago`;
  
  const date = new Date(timestamp * 1000);
  return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

/**
 * Calculate end time from endBlock (rough estimate: 12 sec/block)
 */
export function estimateEndTime(endBlock: string, currentBlock: number): number {
  const blocksRemaining = Number(endBlock) - currentBlock;
  const secondsRemaining = blocksRemaining * 12;
  return Math.floor(Date.now() / 1000) + secondsRemaining;
}

/**
 * Calculate start time from startBlock (rough estimate: 12 sec/block)
 */
export function estimateStartTime(startBlock: string, currentBlock: number): number {
  const blocksUntilStart = Number(startBlock) - currentBlock;
  const secondsUntilStart = blocksUntilStart * 12;
  return Math.floor(Date.now() / 1000) + secondsUntilStart;
}

/**
 * Format an Ethereum address with optional ENS name
 */
export function formatAddress(address: string, ensName?: string | null): string {
  return ensName || `${address.slice(0, 6)}...${address.slice(-4)}`;
}
