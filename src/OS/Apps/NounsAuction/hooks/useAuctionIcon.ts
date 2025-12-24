/**
 * useAuctionIcon Hook
 * Updates the Nouns Auction dock icon with the current auction's Noun
 * Runs globally to keep icon updated even when app is closed
 */

'use client';

import { useEffect, useRef } from 'react';
import { useDockStore } from '@/OS/store/dockStore';
import { getNounDataUrl } from '@/app/lib/nouns/render';
import { useCurrentAuction } from './useAuctionData';

/**
 * Hook that updates the Nouns Auction dock icon with the current Noun
 * Should be called once at the app root level
 */
export function useAuctionIconUpdater() {
  const { data: auctionData } = useCurrentAuction(10000); // Poll every 10 seconds
  const updateAppIcon = useDockStore((state) => state.updateAppIcon);
  const lastNounIdRef = useRef<string | null>(null);

  useEffect(() => {
    const auction = auctionData?.auctions?.[0];
    if (!auction?.noun?.seed) return;

    const nounId = auction.noun.id;
    
    // Only update if the noun has changed
    if (nounId === lastNounIdRef.current) return;
    lastNounIdRef.current = nounId;

    try {
      const seed = {
        background: Number(auction.noun.seed.background),
        body: Number(auction.noun.seed.body),
        accessory: Number(auction.noun.seed.accessory),
        head: Number(auction.noun.seed.head),
        glasses: Number(auction.noun.seed.glasses),
      };

      const dataUrl = getNounDataUrl(seed);
      updateAppIcon('nouns-auction', dataUrl);

      if (process.env.NODE_ENV === 'development') {
        console.log('[AuctionIcon] Updated dock icon to Noun', nounId);
      }
    } catch (error) {
      console.error('[AuctionIcon] Failed to generate icon:', error);
    }
  }, [auctionData, updateAppIcon]);
}

