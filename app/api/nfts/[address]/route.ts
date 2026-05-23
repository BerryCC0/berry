/**
 * GET /api/nfts/[address]
 *
 * Returns NFTs owned by the address, sourced from Alchemy NFT v3
 * (`getNFTsForOwner`). Two modes:
 *
 *   • Catch-all (no `contracts` query param) — returns every NFT the
 *     address holds, with SPAM-filtered Alchemy results plus a local
 *     phishing heuristic. Used by the marketplace editor's "Other" tab
 *     and the ENS avatar picker.
 *
 *   • Per-contract (`?contracts=0xA,0xB`) — returns NFTs from the
 *     specified contracts only, via Alchemy's `contractAddresses[]`
 *     filter. Skips the phishing heuristic because the caller has
 *     explicitly opted into those contracts. Used by the marketplace
 *     editor's known-collection tabs.
 *
 * Pagination: returns up to 100 in one call. Callers can pass `pageKey`
 * for more.
 */

import { NextRequest, NextResponse } from "next/server";
import { LEGIT_CONTRACT_SET } from "@/app/lib/nft-allowlist";

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

function alchemyNftUrl(
  address: string,
  pageKey?: string,
  contracts?: string[],
): string {
  const key = process.env.ALCHEMY_API_KEY;
  if (!key) throw new Error("ALCHEMY_API_KEY not set");
  const base = `https://eth-mainnet.g.alchemy.com/nft/v3/${key}/getNFTsForOwner`;
  const params = new URLSearchParams();
  params.set("owner", address);
  params.set("withMetadata", "true");
  params.set("pageSize", "100");

  if (contracts && contracts.length > 0) {
    // Caller-specified contracts mode — Alchemy returns only matching
    // NFTs. We DON'T add the SPAM exclusion here because the caller has
    // already vouched for the contracts; we'd rather show everything
    // they asked for than risk Alchemy mis-classifying a legit drop.
    for (const c of contracts) params.append("contractAddresses[]", c);
  } else {
    // Catch-all mode — exclude SPAM (Alchemy's heuristic blocklist).
    // We deliberately do NOT exclude AIRDROPS: that bucket conflates
    // legit community drops (Zorbs, ENS quarterly tokens) with phishing,
    // and we'd rather filter actual phishing via our own heuristic.
    params.append("excludeFilters[]", "SPAM");
  }

  if (pageKey) params.set("pageKey", pageKey);
  return `${base}?${params}`;
}

function pickImage(nft: AlchemyNft): string | null {
  const i = nft.image;
  return i?.cachedUrl || i?.thumbnailUrl || i?.originalUrl || null;
}

/**
 * Heuristic defense-in-depth filter for the phishing patterns that leak
 * past Alchemy's SPAM bucket. Runs only in catch-all mode and only for
 * collections NOT on the allowlist. Catches the highest-signal patterns:
 *
 *   • Token or collection name contains a top-level-domain URL fragment
 *     (e.g., "zsteth.com", "claim.aprsteth.com")
 *   • Token name contains classic phishing call-to-action verbs
 *     ("airdrop recipient", "claim your", "access X", "voucher", "redeem")
 *
 * Bias toward false positives: in a governance context, showing one
 * phishing NFT can lead to a proposer clicking through to a malicious
 * site (or worse, voting to list a phishing token), so it's preferable
 * to hide an occasional legit collection than to leak phishing.
 * Add to LEGIT_CONTRACT_SET (in nft-allowlist.ts) when a real collection
 * turns out to be flagged.
 */
const URL_REGEX =
  /\b[a-z0-9-]+\.(com|xyz|io|net|org|app|finance|claim|gift|cash|live)\b/i;
const PHISHING_KEYWORDS = [
  /\bairdrop\s+recipient\b/i,
  /\bclaim\s/i,
  /\baccess\s+[a-z0-9.-]+/i,
  /\bvoucher\b/i,
  /\bredeem\b/i,
  /\beligible\b/i,
  /\breward\s+pack/i,
];

function looksLikePhishing(nft: AlchemyNft): boolean {
  // Allowlist short-circuit — never filter known-legit collections.
  if (LEGIT_CONTRACT_SET.has(nft.contract.address.toLowerCase())) return false;
  const blob = `${nft.name ?? ""} ${nft.contract.name ?? ""}`.trim();
  if (!blob) return false;
  if (URL_REGEX.test(blob)) return true;
  return PHISHING_KEYWORDS.some((re) => re.test(blob));
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
  const contractsParam = searchParams.get("contracts");
  const contracts = contractsParam
    ? contractsParam
        .split(",")
        .map((c) => c.trim())
        .filter((c) => c.startsWith("0x") && c.length === 42)
    : undefined;

  try {
    const res = await fetch(alchemyNftUrl(address, pageKey, contracts));
    if (!res.ok) {
      return NextResponse.json(
        { error: `Alchemy returned ${res.status}` },
        { status: 502 },
      );
    }
    const data = (await res.json()) as AlchemyResponse;

    // The heuristic phishing filter is for catch-all mode only — when
    // the caller has explicitly named contracts, they've vouched for
    // them and we don't second-guess.
    const skipHeuristic = !!contracts && contracts.length > 0;

    const nfts: SimpleNft[] = data.ownedNfts
      .map((n) => {
        const image = pickImage(n);
        if (!image) return null;
        if (!skipHeuristic && looksLikePhishing(n)) return null;
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
