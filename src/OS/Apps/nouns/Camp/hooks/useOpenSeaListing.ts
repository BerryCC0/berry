/**
 * useOpenSeaListing
 * Fetches an active OpenSea Seaport listing for an NFT (contract + tokenId)
 * via /api/opensea/listing and returns the ready-to-submit transaction
 * data plus listing metadata.
 *
 * Backed by the server route so OPENSEA_API_KEY stays out of the browser.
 */

'use client';

import { useQuery } from '@tanstack/react-query';

export interface OpenSeaListingResult {
  to: string;
  value: string;
  calldata: string;
  listing: {
    orderHash: string;
    seller: string;
    priceWei: string;
    priceEth: string;
    expirationTimestamp: number;
    paymentToken: string;
    collectionSlug?: string;
    imageUrl?: string;
    name?: string;
    isReserveListing: boolean;
  };
}

interface OpenSeaListingError {
  error: string;
  detail?: string;
}

export function useOpenSeaListing(
  contract: string | undefined,
  tokenId: string | undefined,
) {
  const enabled =
    !!contract &&
    !!tokenId &&
    /^0x[0-9a-fA-F]{40}$/.test(contract) &&
    /^\d+$/.test(tokenId);

  return useQuery<OpenSeaListingResult, Error>({
    queryKey: ['opensea-listing', contract?.toLowerCase(), tokenId],
    queryFn: async () => {
      const res = await fetch(
        `/api/opensea/listing?contract=${contract}&tokenId=${tokenId}`,
      );
      if (!res.ok) {
        let detail = '';
        try {
          const j = (await res.json()) as OpenSeaListingError;
          detail = j.error || j.detail || '';
        } catch {
          /* ignore */
        }
        throw new Error(detail || `OpenSea lookup failed (${res.status})`);
      }
      return (await res.json()) as OpenSeaListingResult;
    },
    enabled,
    staleTime: 30 * 1000, // 30s — listings can change quickly
    retry: 1,
  });
}

/**
 * Parse an OpenSea asset URL into a contract address + token ID.
 * Supports the two URL shapes OpenSea uses:
 *   - https://opensea.io/assets/ethereum/0xCONTRACT/TOKENID
 *   - https://opensea.io/item/ethereum/0xCONTRACT/TOKENID
 */
export function parseOpenSeaUrl(
  url: string,
): { contract: string; tokenId: string } | null {
  const trimmed = url.trim();
  if (!trimmed) return null;
  const match = trimmed.match(
    /opensea\.io\/(?:assets|item)\/ethereum\/(0x[0-9a-fA-F]{40})\/(\d+)/,
  );
  if (!match) return null;
  return { contract: match[1], tokenId: match[2] };
}
