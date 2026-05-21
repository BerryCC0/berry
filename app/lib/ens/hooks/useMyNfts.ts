/**
 * NFTs owned by an address — used by the ENS avatar picker.
 *
 * Backed by /api/nfts/[address] which queries Alchemy NFT v3. Each NFT
 * carries a pre-formatted `ensAvatarUri` string that can be written
 * directly to the `avatar` text record as an ENSIP-12 NFT-typed avatar
 * (the ENS metadata service resolves it to the actual image at query time).
 */

import { useInfiniteQuery } from "@tanstack/react-query";

export interface MyNft {
  contract: string;
  tokenId: string;
  tokenType: "ERC721" | "ERC1155";
  name: string | null;
  collectionName: string | null;
  image: string;
  /** Ready-to-write `avatar` text record value. */
  ensAvatarUri: string;
}

interface NftsResponse {
  address: string;
  nfts: MyNft[];
  pageKey: string | null;
  totalCount: number;
}

export function useMyNfts(address: string | undefined) {
  return useInfiniteQuery<NftsResponse>({
    queryKey: ["nfts", address],
    queryFn: async ({ pageParam }) => {
      const url = new URL(`/api/nfts/${address!.toLowerCase()}`, window.location.origin);
      if (pageParam) url.searchParams.set("pageKey", pageParam as string);
      const res = await fetch(url);
      if (!res.ok) throw new Error(`Failed to fetch NFTs: ${res.status}`);
      return res.json();
    },
    initialPageParam: undefined,
    getNextPageParam: (last) => last.pageKey ?? undefined,
    enabled: !!address && address.startsWith("0x") && address.length === 42,
    staleTime: 60_000,
  });
}
