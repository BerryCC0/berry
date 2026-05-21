/**
 * GET /api/nfts/[address]
 *
 * Returns NFTs owned by the address, used by the ENS avatar picker.
 * Sources from Alchemy NFT v3 (`getNFTsForOwner`). Spam-filtered and
 * limited to NFTs with valid images — the avatar picker has no use
 * for tokens that wouldn't render.
 *
 * Pagination: returns up to 100 in one call. The picker can request
 * `pageKey` for more if the user has a large collection.
 */

import { NextRequest, NextResponse } from "next/server";

interface SimpleNft {
  contract: string;
  tokenId: string;
  /** "ERC721" | "ERC1155" */
  tokenType: "ERC721" | "ERC1155";
  name: string | null;
  collectionName: string | null;
  /** Best image URL we can find. NFTs with no image are filtered out. */
  image: string;
  /** Pre-formatted as the ENS avatar URI string. */
  ensAvatarUri: string;
}

interface AlchemyNft {
  contract: { address: string; name?: string };
  tokenId: string;
  tokenType: "ERC721" | "ERC1155";
  name?: string;
  image?: {
    cachedUrl?: string;
    thumbnailUrl?: string;
    originalUrl?: string;
  };
}

interface AlchemyResponse {
  ownedNfts: AlchemyNft[];
  pageKey?: string;
  totalCount: number;
}

function alchemyNftUrl(address: string, pageKey?: string): string {
  const key = process.env.ALCHEMY_API_KEY;
  if (!key) throw new Error("ALCHEMY_API_KEY not set");
  const base = `https://eth-mainnet.g.alchemy.com/nft/v3/${key}/getNFTsForOwner`;
  const params = new URLSearchParams({
    owner: address,
    withMetadata: "true",
    excludeFilters: "SPAM",
    pageSize: "100",
  });
  if (pageKey) params.set("pageKey", pageKey);
  return `${base}?${params}`;
}

function pickImage(nft: AlchemyNft): string | null {
  const i = nft.image;
  return i?.cachedUrl || i?.thumbnailUrl || i?.originalUrl || null;
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ address: string }> },
) {
  const { address: rawAddress } = await params;
  const address = rawAddress?.toLowerCase();

  if (!address || !address.startsWith("0x") || address.length !== 42) {
    return NextResponse.json({ error: "Invalid address" }, { status: 400 });
  }

  const { searchParams } = new URL(request.url);
  const pageKey = searchParams.get("pageKey") ?? undefined;

  try {
    const res = await fetch(alchemyNftUrl(address, pageKey));
    if (!res.ok) {
      return NextResponse.json(
        { error: `Alchemy returned ${res.status}` },
        { status: 502 },
      );
    }
    const data = (await res.json()) as AlchemyResponse;

    const nfts: SimpleNft[] = data.ownedNfts
      .map((n) => {
        const image = pickImage(n);
        if (!image) return null;
        const type = n.tokenType === "ERC1155" ? "erc1155" : "erc721";
        return {
          contract: n.contract.address.toLowerCase(),
          tokenId: n.tokenId,
          tokenType: n.tokenType,
          name: n.name ?? null,
          collectionName: n.contract.name ?? null,
          image,
          ensAvatarUri: `eip155:1/${type}:${n.contract.address.toLowerCase()}/${n.tokenId}`,
        };
      })
      .filter((x): x is SimpleNft => x !== null);

    return NextResponse.json({
      address,
      nfts,
      pageKey: data.pageKey ?? null,
      totalCount: data.totalCount,
    });
  } catch (error) {
    console.error("[API] /api/nfts failed:", error);
    return NextResponse.json(
      { error: "Failed to fetch NFTs" },
      { status: 500 },
    );
  }
}
