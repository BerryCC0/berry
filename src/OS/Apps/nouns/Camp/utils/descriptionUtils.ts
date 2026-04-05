/**
 * Description Utilities
 * Shared helpers for processing proposal/candidate descriptions
 */

/**
 * Escape special regex characters in a string
 */
export function escapeRegex(str: string): string {
  return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

/**
 * Strip the title from the description
 * The API returns description with title at the start (e.g., "# Title\n\nDescription...")
 */
export function stripTitleFromDescription(description: string, title: string): string {
  // Common patterns for title in description:
  // 1. "# Title\n\n" (markdown heading)
  // 2. "Title\n\n" (plain text at start)
  // 3. "# Title\n" (markdown heading with single newline)
  
  let stripped = description;
  
  // Try to remove markdown heading version first
  const markdownTitlePattern = new RegExp(`^#\\s*${escapeRegex(title)}\\s*\\n+`, 'i');
  if (markdownTitlePattern.test(stripped)) {
    stripped = stripped.replace(markdownTitlePattern, '');
  } else {
    // Try plain text title at start
    const plainTitlePattern = new RegExp(`^${escapeRegex(title)}\\s*\\n+`, 'i');
    if (plainTitlePattern.test(stripped)) {
      stripped = stripped.replace(plainTitlePattern, '');
    }
  }
  
  return stripped.trim();
}

/**
 * Format a duration in seconds into a human-readable string
 */
export function formatTimeRemaining(seconds: number): string {
  if (seconds <= 0) return 'Ended';
  
  const days = Math.floor(seconds / 86400);
  const hours = Math.floor((seconds % 86400) / 3600);
  
  if (days > 0) {
    return `${days} day${days > 1 ? 's' : ''}, ${hours} hour${hours !== 1 ? 's' : ''}`;
  }
  return `${hours} hour${hours !== 1 ? 's' : ''}`;
}
