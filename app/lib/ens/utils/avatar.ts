/**
 * Helpers for the ENS `avatar` text record.
 *
 * ENSIP-12 defines two formats:
 *   - URL/IPFS: any direct image URL or ipfs://... or data: URI
 *   - NFT: eip155:{chainId}/erc{721|1155}:{contract}/{tokenId}
 *
 * For NFT avatars, the ENS metadata service resolves the URI to the
 * actual image at query time (via the NFT contract's tokenURI).
 */

export type AvatarSource =
  | { type: "url"; value: string }
  | { type: "ipfs"; value: string }
  | { type: "nft"; chainId: number; standard: "erc721" | "erc1155"; contract: string; tokenId: string }
  | { type: "data"; value: string }
  | null;

const NFT_RE = /^eip155:(\d+)\/(erc721|erc1155):(0x[0-9a-fA-F]{40})\/(\d+)$/;

export function parseAvatarRecord(value: string | null | undefined): AvatarSource {
  if (!value) return null;
  if (value.startsWith("data:")) return { type: "data", value };
  if (value.startsWith("ipfs://")) return { type: "ipfs", value };
  const m = NFT_RE.exec(value);
  if (m) {
    return {
      type: "nft",
      chainId: Number(m[1]),
      standard: m[2] as "erc721" | "erc1155",
      contract: m[3]!.toLowerCase(),
      tokenId: m[4]!,
    };
  }
  if (/^https?:\/\//i.test(value)) return { type: "url", value };
  return null;
}

export function formatNftAvatar(params: {
  chainId?: number;
  standard: "erc721" | "erc1155";
  contract: string;
  tokenId: string;
}): string {
  const { chainId = 1, standard, contract, tokenId } = params;
  return `eip155:${chainId}/${standard}:${contract.toLowerCase()}/${tokenId}`;
}
