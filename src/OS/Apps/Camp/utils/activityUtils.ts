/**
 * Activity Utilities
 * Helpers for resolving reply/repost relationships in the activity feed
 */

import type { ActivityItem } from '../types';
import { parseRepost, parseReply } from './repostParser';

/**
 * Find the full address of the original poster from a reply.
 * Matches the truncated address and quoted text against all feed items.
 */
export function findOriginalPosterAddress(
  reason: string | undefined,
  allItems: ActivityItem[] | undefined
): string | undefined {
  if (!reason || !allItems) return undefined;
  
  const replyInfo = parseReply(reason);
  if (!replyInfo) return undefined;
  
  const truncatedTarget = replyInfo.targetAuthor.toLowerCase();
  
  // Find a post where:
  // 1. The actor matches the truncated address
  // 2. The reason matches the quoted text
  for (const otherItem of allItems) {
    if (!otherItem.reason) continue;
    
    // Check if actor matches the truncated pattern
    const truncatedActor = `${otherItem.actor.slice(0, 6)}...${otherItem.actor.slice(-4)}`.toLowerCase();
    if (truncatedActor !== truncatedTarget) continue;
    
    // Check if the reason contains the quoted text (or matches exactly)
    const normalizedOther = otherItem.reason.trim().toLowerCase();
    const normalizedQuote = replyInfo.quotedText.trim().toLowerCase();
    
    if (normalizedOther === normalizedQuote || normalizedOther.includes(normalizedQuote)) {
      return otherItem.actor;
    }
  }
  
  return undefined;
}

/**
 * Find the full address of the original poster from a repost.
 * Matches the quoted text against all feed items.
 */
export function findRepostOriginalPosterAddress(
  reason: string | undefined,
  allItems: ActivityItem[] | undefined
): string | undefined {
  if (!reason || !allItems) return undefined;
  
  const repostInfo = parseRepost(reason);
  if (!repostInfo) return undefined;
  
  // Find a post where the reason matches the quoted text
  for (const otherItem of allItems) {
    if (!otherItem.reason) continue;
    
    // Check if the reason matches the quoted text
    const normalizedOther = otherItem.reason.trim().toLowerCase();
    const normalizedQuote = repostInfo.originalReason.trim().toLowerCase();
    
    if (normalizedOther === normalizedQuote || normalizedOther.includes(normalizedQuote)) {
      return otherItem.actor;
    }
  }
  
  return undefined;
}
