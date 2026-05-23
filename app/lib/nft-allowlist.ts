/**
 * Allowlist of NFT collections we recognise as legitimate — the single
 * source of truth for both the `/api/nfts/[address]` server filter and the
 * Camp `OpenSeaListNftEditor` tab bar.
 *
 * The tab-shaped model (rather than a flat address Set) is intentional:
 *   • The editor renders one tab per entry.
 *   • Each tab lazy-loads its collection's holdings via Alchemy's
 *     `contractAddresses[]` filter, so we only fetch what's needed.
 *   • Multiple contract addresses can sit under a single tab — useful for
 *     ENS, which historically has tokens in BOTH the Base Registrar AND
 *     the newer Name Wrapper.
 *
 * Conservative additions only. Each entry is a trust statement: NFTs from
 * these contracts bypass the phishing heuristic regardless of name.
 */

import type { Address } from 'viem';

/**
 * Hint to the renderer about how to display an NFT from this tab. Nouns
 * have a dedicated on-chain SVG renderer (`NounImageById`); other
 * collections use the Alchemy-provided image URL.
 */
export type NftRenderHint = 'nouns' | 'default';

export interface LegitCollectionTab {
  /** URL-safe identifier — used as the React key for the tab. */
  key: string;
  /** Short label shown in the tab bar (≤14 chars works best). */
  label: string;
  /** Longer description used in the empty-state copy. */
  description?: string;
  /** Contracts that count toward this tab. Most tabs have exactly one. */
  contracts: Address[];
  /** Image rendering strategy. */
  renderHint: NftRenderHint;
}

export const LEGIT_COLLECTION_TABS: readonly LegitCollectionTab[] = [
  {
    key: 'nouns',
    label: 'Nouns',
    description: 'Nouns held by the treasury',
    contracts: ['0x9C8fF314C9Bc7F6e59A9d9225Fb22946427eDC03'],
    renderHint: 'nouns',
  },
  {
    key: 'lil-nouns',
    label: 'Lil Nouns',
    description: 'Lil Nouns held by the treasury',
    contracts: ['0x4b10701Bfd7BFEdc47d50562b76b436fbB5BdB3B'],
    renderHint: 'default',
  },
  {
    key: 'zorbs',
    label: 'Zorbs',
    description: 'Zora Zorb airdrops the treasury qualified for',
    contracts: ['0xCa21d4228cDCc68D4e23807E5e370C07577Dd152'],
    renderHint: 'default',
  },
  {
    key: 'ens',
    label: 'ENS',
    description: 'ENS names + name-wrapped subdomains the treasury owns',
    contracts: [
      '0x57f1887a8BF19b14fC0dF6Fd9B2acc9Af147eA85', // Base Registrar (legacy .eth)
      '0xD4416b13d2b3a9aBae7AcD5D6C2BbDBE25686401', // Name Wrapper (subdomains + wrapped)
    ],
    renderHint: 'default',
  },
];

/**
 * Flat lowercased set of every contract on the allowlist. Used by the
 * server-side phishing filter to short-circuit (allowlisted → never
 * filtered) and by the client to decide whether an NFT belongs in a
 * specific tab or the "Other" catch-all.
 */
export const LEGIT_CONTRACT_SET: ReadonlySet<string> = new Set(
  LEGIT_COLLECTION_TABS.flatMap((t) =>
    t.contracts.map((c) => c.toLowerCase()),
  ),
);

/** Look up the tab a contract address belongs to, or null. */
export function tabForContract(contract: string): LegitCollectionTab | null {
  const lower = contract.toLowerCase();
  for (const tab of LEGIT_COLLECTION_TABS) {
    if (tab.contracts.some((c) => c.toLowerCase() === lower)) return tab;
  }
  return null;
}
