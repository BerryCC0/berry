/**
 * Nouns V2 + Small Grants contract registry.
 * Mainnet only. Both systems share the same handoff bundle but are independent
 * deployments — V2 has its own token/auction/governor; Small Grants is a
 * single contract that reads voting power from mainnet V1 NounsToken.
 *
 * Deploy ceremony executed 2026-05-09: NounV2Token now reads art from a
 * V2-owned NounsDescriptorV2 (DAO-governed, proposable forever) and a custom
 * seeder with the hidden "slobber" rule. See SLOBBER_RULE in utils/slobber.ts.
 */

import { nounV2TokenAbi } from '@/app/lib/nouns-v2/abis/nounV2Token';
import { nounV2AuctionHouseAbi } from '@/app/lib/nouns-v2/abis/nounV2AuctionHouse';
import { nounV2TreasuryAbi } from '@/app/lib/nouns-v2/abis/nounV2Treasury';
import { smallGrantsTreasuryAbi } from '@/app/lib/nouns-v2/abis/smallGrantsTreasury';

export const V2_CHAIN_ID = 1;

export const V2_ADDRESSES = {
  token: '0xb1d6bdf9326dd09183c2e9d25af5e22c637293b9',
  auctionHouse: '0x9a6ddb16e23967d5482e5bfd7444a04a5d5145fc',
  treasury: '0x2cdeb0d251674710840d9fa990d1de138dfe7c00',
  descriptor: '0xAe0247Ca34B211a61b03A95F8008DCb8B3124B89',
  art: '0x3409A4A360A028b7Aa2eBF769d6306d96B976b3f',
  seeder: '0xd777E701506A86fE89f07f963aA6c08d6905cFF8',
  safe: '0xADa31Add8450CA0422983B9a3103633b78938617',
  deployer: '0xda094c5b63261aef51c41a5d92660648cab90417',
} as const satisfies Record<string, `0x${string}`>;

/** First block where the V2 system has any state. Used by Ponder + history queries. */
export const V2_START_BLOCK = BigInt(24951808);

export const SG_ADDRESSES = {
  treasury: '0xbac9233725440c595b19d975309cc98cb259253a',
  /** V1 NounsToken — Small Grants reads voting power from this. */
  v1Token: '0x9C8fF314C9Bc7F6e59A9d9225Fb22946427eDC03',
} as const satisfies Record<string, `0x${string}`>;

export const V2_CONTRACTS = {
  token: { address: V2_ADDRESSES.token, abi: nounV2TokenAbi },
  auctionHouse: { address: V2_ADDRESSES.auctionHouse, abi: nounV2AuctionHouseAbi },
  treasury: { address: V2_ADDRESSES.treasury, abi: nounV2TreasuryAbi },
} as const;

export const SG_CONTRACTS = {
  treasury: { address: SG_ADDRESSES.treasury, abi: smallGrantsTreasuryAbi },
} as const;

export const v2TxLink = (hash: string) => `https://etherscan.io/tx/${hash}`;
export const v2AddressLink = (addr: string) => `https://etherscan.io/address/${addr}`;
