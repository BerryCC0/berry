/**
 * useNftMetadata
 * Fetch an NFT's image + name via OpenSea's chain/{chain}/contract/{c}/nfts/{id}
 * endpoint (proxied through our /api/opensea/listing route's underlying
 * caller — we add a thin /api/opensea/nft route below if needed).
 *
 * For Nouns specifically the caller should bypass this and render
 * NounImage directly — no network round-trip required.
 *
 * Returns a stable shape regardless of fetch status; consumers can
 * conditionally render the image when `imageUrl` lands.
 */

'use client';

import { useQuery } from '@tanstack/react-query';

export interface NftMetadata {
  imageUrl: string | null;
  name: string | null;
  collectionSlug: string | null;
}

interface OpenSeaNftResponse {
  nft?: {
    display_image_url?: string;
    image_url?: string;
    name?: string;
    collection?: string;
  };
}

export function useNftMetadata(
  contract: string | undefined,
  tokenId: string | undefined,
) {
  const enabled =
    !!contract &&
    !!tokenId &&
    /^0x[0-9a-fA-F]{40}$/.test(contract) &&
    /^\d+$/.test(tokenId);

  return useQuery<NftMetadata, Error>({
    queryKey: ['nft-metadata', contract?.toLowerCase(), tokenId],
    queryFn: async () => {
      const res = await fetch(
        `/api/opensea/nft?contract=${contract}&tokenId=${tokenId}`,
      );
      if (!res.ok) {
        throw new Error(`NFT metadata fetch failed (${res.status})`);
      }
      const data = (await res.json()) as OpenSeaNftResponse;
      return {
        imageUrl:
          data.nft?.display_image_url || data.nft?.image_url || null,
        name: data.nft?.name || null,
        collectionSlug: data.nft?.collection || null,
      };
    },
    enabled,
    // NFT metadata is effectively immutable for the lifetime of a session.
    staleTime: 30 * 60 * 1000,
    retry: 1,
  });
}
