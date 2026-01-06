/**
 * Repost/Reply Parser
 * Detects and parses reposts (+1 quotes) and replies (@address quotes)
 * Based on the convention used by other Nouns clients
 */

// Matches an @-prefixed truncated address like "@0xe3D7...A436"
// Group 1: the address
export const REPLY_PATTERN = /^@(0x[a-zA-Z0-9]{4}\.{3}[a-zA-Z0-9]{4})/m;

/**
 * Unquote markdown blockquote
 * Removes leading > from each line
 */
function unquote(text: string): string {
  return text
    .split('\n')
    .map(line => line.replace(/^>\s?/, ''))
    .join('\n')
    .trim();
}

/**
 * Truncate an address to format: 0x1234...5678
 */
function truncateAddress(address: string): string {
  return `${address.slice(0, 6)}...${address.slice(-4)}`;
}

export interface RepostInfo {
  isRepost: boolean;
  originalReason: string;
  // These will be filled in by the component that has access to other votes
  originalAuthor?: string;
  originalSupport?: number;
}

export interface ReplyInfo {
  isReply: boolean;
  targetAuthor: string; // Truncated address from the @mention
  replyBody: string;
  quotedText: string;
}

/**
 * Check if a reason is a repost (+1 followed by quote)
 */
export function parseRepost(reason: string | undefined | null): RepostInfo | null {
  if (!reason || reason.trim() === '') return null;
  
  const trimmed = reason.trim();
  
  // Check if it starts with "+1" followed by blank line and then blockquote
  if (!trimmed.startsWith('+1')) return null;
  
  const lines = trimmed.split('\n');
  if (lines[0].trim() !== '+1') return null;
  
  // Find where the blockquote starts
  let quoteStartIndex = -1;
  for (let i = 1; i < lines.length; i++) {
    if (lines[i].trim().startsWith('>')) {
      quoteStartIndex = i;
      break;
    }
  }
  
  if (quoteStartIndex === -1) return null;
  
  // Collect all quote lines
  const quoteLines: string[] = [];
  for (let i = quoteStartIndex; i < lines.length; i++) {
    if (lines[i].trim().startsWith('>') || (quoteLines.length > 0 && lines[i].trim() === '')) {
      quoteLines.push(lines[i]);
    } else if (quoteLines.length > 0) {
      break;
    }
  }
  
  if (quoteLines.length === 0) return null;
  
  const quotedText = unquote(quoteLines.join('\n'));
  
  return {
    isRepost: true,
    originalReason: quotedText,
  };
}

/**
 * Clean up reply body text by removing:
 * - Trailing separators like "|"
 * - Trailing empty lines
 * - Trailing blockquotes (since we show them separately)
 */
function cleanReplyBody(text: string): string {
  let cleaned = text;
  
  // Split into lines for processing
  const lines = cleaned.split('\n');
  
  // Remove trailing lines that are:
  // - Empty or whitespace only
  // - Just a separator character like "|"
  // - Blockquotes (lines starting with ">")
  while (lines.length > 0) {
    const lastLine = lines[lines.length - 1].trim();
    if (lastLine === '' || lastLine === '|' || lastLine.startsWith('>')) {
      lines.pop();
    } else {
      break;
    }
  }
  
  // Also remove any trailing blockquote sections from the middle
  // (users sometimes quote inline, we only want the main reply text)
  let lastNonQuoteIndex = lines.length - 1;
  while (lastNonQuoteIndex >= 0 && lines[lastNonQuoteIndex].trim().startsWith('>')) {
    lastNonQuoteIndex--;
  }
  
  // Keep everything up to and including the last non-quote line
  cleaned = lines.slice(0, lastNonQuoteIndex + 1).join('\n').trim();
  
  return cleaned;
}

/**
 * Check if a reason is a reply (@address followed by content and quote)
 */
export function parseReply(reason: string | undefined | null): ReplyInfo | null {
  if (!reason || reason.trim() === '') return null;
  
  const authorMatch = reason.match(REPLY_PATTERN);
  if (!authorMatch || !authorMatch[1]) return null;
  
  const authorAddress = authorMatch[1];
  
  // Find the blockquote section (last occurrence of lines starting with >)
  const lines = reason.split('\n');
  let quoteStartIndex = -1;
  
  // Find the last blockquote section
  for (let i = lines.length - 1; i >= 0; i--) {
    if (lines[i].startsWith('>')) {
      quoteStartIndex = i;
      // Keep going back while we find quote lines
      while (i > 0 && lines[i - 1].startsWith('>')) {
        i--;
        quoteStartIndex = i;
      }
      break;
    }
  }
  
  if (quoteStartIndex === -1) return null;
  
  const quoteLines = lines.slice(quoteStartIndex);
  const quotedText = unquote(quoteLines.join('\n'));
  
  // The reply body is everything between the @mention and the final quote
  const afterMention = reason.slice(authorMatch[0].length).trim();
  const rawReplyBody = afterMention.slice(0, afterMention.lastIndexOf(quoteLines[0])).trim();
  
  // Clean up the reply body
  const replyBody = cleanReplyBody(rawReplyBody);
  
  return {
    isReply: true,
    targetAuthor: authorAddress,
    replyBody,
    quotedText,
  };
}

/**
 * Match a quoted reason to find the original vote/feedback
 * Returns the matching item if found
 */
export function findOriginalPost<T extends { voterId?: string; actor?: string; reason?: string }>(
  quotedReason: string,
  posts: T[],
  targetAuthorTruncated?: string
): T | null {
  const normalizedQuote = quotedReason.trim().toLowerCase();
  
  for (const post of posts) {
    if (!post.reason) continue;
    
    const normalizedReason = post.reason.trim().toLowerCase();
    
    // Check if the reason matches exactly
    if (normalizedReason !== normalizedQuote) continue;
    
    // If we have a target author to match, check it
    if (targetAuthorTruncated) {
      const postAuthor = (post.voterId || post.actor || '').toLowerCase();
      const truncatedPostAuthor = truncateAddress(postAuthor).toLowerCase();
      if (truncatedPostAuthor !== targetAuthorTruncated.toLowerCase()) continue;
    }
    
    return post;
  }
  
  return null;
}
