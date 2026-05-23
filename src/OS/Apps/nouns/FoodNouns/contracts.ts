/**
 * Food Nouns contract registry
 * Mainnet only. V1 fork — no client IDs, no candidates, no signed proposals.
 */

import { fnAuctionHouseAbi } from './abis/auctionHouseAbi';
import { fnGovernorAbi } from './abis/governorAbi';
import { fnTokenAbi } from './abis/tokenAbi';

export const FN_ADDRESSES = {
  token: '0xF5331380e1d19757388A6E6198BF3BDc93D8b07a',
  auctionHouse: '0xfAa4bbe589a39745833e2BecE8d401b6195A07b1',
  governor: '0xF72FAf0050a2cBb645362452a12d46EAdCC09177',
  treasury: '0xaF1BFd8bF02C5EC169d20faba53BF0fa761bf65f',
  descriptor: '0x79Db17727aD213e360DE893D9075Ae5f75D4f89C',
} as const satisfies Record<string, `0x${string}`>;

/**
 * Per-auction proceeds split, hard-coded into the FN AuctionHouse implementation
 * at 0xd80df22da89a7316079079bdd31ec8680920d79a. Every settled auction's winning
 * bid is divided four ways via `_safeTransferETHWithFallback`:
 *
 *   50% → owner()              = FN Treasury timelock (FN_ADDRESSES.treasury)
 *   25% → WALLET_NOUNS_DAO     = Nouns DAO V1 Treasury (tribute to parent)
 *   15% → WALLET_KITCHEN_NOUNCIL = Food Nouns sub-DAO multisig
 *   10% → WALLET_FOODNOUNDERS  = Foodnounders multisig
 *
 * Percentages are integer-divided in the contract, so per-auction sums can be
 * a wei or two short of the total bid. Negligible at the aggregate level.
 *
 * The order here matches the visual order in the Treasury split card.
 */
export const FN_AUCTION_SPLIT = [
  {
    address: FN_ADDRESSES.treasury,
    label: 'Food Nouns Treasury',
    sub: 'this DAO',
    percent: 50,
  },
  {
    address: '0x0BC3807Ec262cB779b38D65b38158acC3bfedE10',
    label: 'Nouns DAO V1 Treasury',
    sub: 'tribute to mainline Nouns',
    percent: 25,
  },
  {
    address: '0x6699a1f89892C0aAed6610e9eB8996d5006F4aE1',
    label: 'Kitchen Nouncil',
    sub: 'sub-DAO multisig',
    percent: 15,
  },
  {
    address: '0xf3B4bABD413BB5C572Cbd52A8824fdd2d0ab1FA5',
    label: 'Foodnounders',
    sub: 'founders multisig',
    percent: 10,
  },
] as const;

export const FN_CHAIN_ID = 1;

export const FN_CONTRACTS = {
  token: { address: FN_ADDRESSES.token, abi: fnTokenAbi },
  auctionHouse: { address: FN_ADDRESSES.auctionHouse, abi: fnAuctionHouseAbi },
  governor: { address: FN_ADDRESSES.governor, abi: fnGovernorAbi },
} as const;

/** Etherscan link helpers */
export const fnTxLink = (hash: string) => `https://etherscan.io/tx/${hash}`;
export const fnAddressLink = (addr: string) => `https://etherscan.io/address/${addr}`;
