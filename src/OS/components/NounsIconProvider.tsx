/**
 * NounsIconProvider
 * Keeps the Nouns Auction dock icon updated with the current auction's Noun
 * This runs globally so the icon updates even when the app isn't open
 */

'use client';

import { useAuctionIconUpdater } from '@/OS/Apps/NounsAuction/hooks/useAuctionIcon';

export function NounsIconProvider() {
  useAuctionIconUpdater();
  return null; // This component renders nothing, just runs the hook
}

