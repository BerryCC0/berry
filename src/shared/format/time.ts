/**
 * Shared date/time formatting utilities.
 *
 * Replaces per-app implementations:
 *   - Camp/utils/formatUtils.ts → formatTimeAgo(), formatRelativeTime()
 *   - Clients/utils.ts → timeAgo(), formatDate(), shortDate()
 *   - Auction/utils/auctionHelpers.ts → formatCountdown(), formatTimestamp()
 */

/** Normalise a unix-seconds timestamp (string or number) to number. */
function toSeconds(timestamp: string | number): number {
  return typeof timestamp === 'string' ? Number(timestamp) : timestamp;
}

/**
 * Compact relative time string (e.g. "5m ago", "3d ago").
 * Falls back to a short date ("Jan 15") for anything older than 7 days,
 * or includes "mo ago" for up to ~30 days if `extendedRange` is true.
 */
export function timeAgo(
  timestamp: string | number,
  opts?: { extendedRange?: boolean },
): string {
  const diff = Math.floor(Date.now() / 1000) - toSeconds(timestamp);
  if (diff < 0 || diff < 60) return 'just now';
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
  if (diff < 604800) return `${Math.floor(diff / 86400)}d ago`;
  if (opts?.extendedRange && diff < 2592000) {
    return `${Math.floor(diff / 86400)}d ago`;
  }
  if (opts?.extendedRange && diff < 31536000) {
    return `${Math.floor(diff / 2592000)}mo ago`;
  }
  // Older than 7 days (or 12 months in extended mode) — show date
  const date = new Date(toSeconds(timestamp) * 1000);
  return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

/**
 * Human-readable relative future time with a prefix
 * (e.g. "Ends in 5 hours", "Starts in 2 days").
 * Returns "Ended" for past timestamps.
 */
export function formatRelativeTime(
  timestamp: number,
  prefix: string,
): string {
  const diff = timestamp - Math.floor(Date.now() / 1000);
  if (diff < 0) return 'Ended';
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
 * Countdown display: "2h 15m 30s". Returns "Ended" when <= 0.
 */
export function formatCountdown(secondsRemaining: number): string {
  if (secondsRemaining <= 0) return 'Ended';
  const h = Math.floor(secondsRemaining / 3600);
  const m = Math.floor((secondsRemaining % 3600) / 60);
  const s = Math.floor(secondsRemaining % 60);
  return `${h}h ${m}m ${s}s`;
}

/**
 * Medium date: "Jan 15, 2025".
 */
export function formatDate(timestamp: string | number): string {
  return new Date(toSeconds(timestamp) * 1000).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
}

/**
 * Long date: "January 15, 2025".
 */
export function formatTimestamp(timestamp: string | number): string {
  return new Date(toSeconds(timestamp) * 1000).toLocaleDateString('en-US', {
    month: 'long',
    day: 'numeric',
    year: 'numeric',
  });
}

/**
 * Chart-axis short date: "1/15".
 */
export function shortDate(timestamp: string | number): string {
  const d = new Date(toSeconds(timestamp) * 1000);
  return `${d.getMonth() + 1}/${d.getDate()}`;
}
