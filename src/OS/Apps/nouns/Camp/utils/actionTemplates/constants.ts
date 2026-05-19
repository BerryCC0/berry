/**
 * Constants: token lists, contract addresses
 */

import { Address } from 'viem';
import { NOUNS_ADDRESSES } from '@/app/lib/nouns';
import { TokenInfo } from './types';

export const COMMON_TOKENS: TokenInfo[] = [
  { symbol: 'USDC', address: '0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48', decimals: 6 },
  { symbol: 'WETH', address: '0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2', decimals: 18 },
  { symbol: 'DAI', address: '0x6B175474E89094C44Da98b954EedeAC495271d0F', decimals: 18 },
  { symbol: 'USDT', address: '0xdAC17F958D2ee523a2206206994597C13D831ec7', decimals: 6 },
  { symbol: 'stETH', address: '0xae7ab96520DE3A18E5e111B5EaAb095312D7fE84', decimals: 18 },
  { symbol: 'wstETH', address: '0x7f39C581F595B53c5cb19bD0b3f8dA6c935E2Ca0', decimals: 18 },
  { symbol: 'rETH', address: '0xae78736Cd615f374D3085123A210448E74Fc6393', decimals: 18 },
  { symbol: 'mETH', address: '0xd5F7838F5C461fefF7FE49ea5ebaF7728bB0ADfa', decimals: 18 },
];

/** mETH token address — Mantle's LST. */
export const METH_ADDRESS =
  '0xd5F7838F5C461fefF7FE49ea5ebaF7728bB0ADfa' as Address;

/** wstETH token address (lifted from COMMON_TOKENS for direct use in templates). */
export const WSTETH_ADDRESS =
  '0x7f39C581F595B53c5cb19bD0b3f8dA6c935E2Ca0' as Address;

export const EXTERNAL_CONTRACTS = {
  USDC: { address: '0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48' as Address },
  WETH: { address: '0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2' as Address },
  DAI: { address: '0x6B175474E89094C44Da98b954EedeAC495271d0F' as Address },
};

// ============================================================================
// External DEX / Staking contract addresses
// ============================================================================

/** Uniswap V3 SwapRouter02 — used by `swap-uniswap-v3` template. */
export const UNISWAP_V3_ROUTER_ADDRESS =
  '0x68b3465833fb72A70ecDF485E0e4C7bD8665Fc45' as Address;

/** Uniswap V3 QuoterV2 — used to fetch live swap quotes for the editor UI. */
export const UNISWAP_V3_QUOTER_ADDRESS =
  '0x61fFE014bA17989E743c5F6cB21bF9697530B21e' as Address;

/** Uniswap V3 fee tiers in basis points × 100 (e.g. 3000 = 0.3%). */
export const UNISWAP_V3_FEE_TIERS = [100, 500, 3000, 10000] as const;
export type UniswapV3FeeTier = (typeof UNISWAP_V3_FEE_TIERS)[number];

/** Minimal ABI for QuoterV2.quoteExactInputSingle. */
export const UNISWAP_V3_QUOTER_ABI = [
  {
    inputs: [
      {
        components: [
          { internalType: 'address', name: 'tokenIn', type: 'address' },
          { internalType: 'address', name: 'tokenOut', type: 'address' },
          { internalType: 'uint256', name: 'amountIn', type: 'uint256' },
          { internalType: 'uint24', name: 'fee', type: 'uint24' },
          { internalType: 'uint160', name: 'sqrtPriceLimitX96', type: 'uint160' },
        ],
        internalType: 'struct IQuoterV2.QuoteExactInputSingleParams',
        name: 'params',
        type: 'tuple',
      },
    ],
    name: 'quoteExactInputSingle',
    outputs: [
      { internalType: 'uint256', name: 'amountOut', type: 'uint256' },
      { internalType: 'uint160', name: 'sqrtPriceX96After', type: 'uint160' },
      { internalType: 'uint32', name: 'initializedTicksCrossed', type: 'uint32' },
      { internalType: 'uint256', name: 'gasEstimate', type: 'uint256' },
    ],
    stateMutability: 'nonpayable',
    type: 'function',
  },
] as const;

/** Minimal ERC-20 ABI for symbol / decimals / name reads. */
export const MINIMAL_ERC20_ABI = [
  {
    inputs: [],
    name: 'symbol',
    outputs: [{ internalType: 'string', name: '', type: 'string' }],
    stateMutability: 'view',
    type: 'function',
  },
  {
    inputs: [],
    name: 'decimals',
    outputs: [{ internalType: 'uint8', name: '', type: 'uint8' }],
    stateMutability: 'view',
    type: 'function',
  },
  {
    inputs: [],
    name: 'name',
    outputs: [{ internalType: 'string', name: '', type: 'string' }],
    stateMutability: 'view',
    type: 'function',
  },
] as const;

/** CowSwap GPv2Settlement contract — used by `swap-cowswap` to pre-sign orders. */
export const COWSWAP_SETTLEMENT_ADDRESS =
  '0x9008D19f58AAbD9eD0D60971565AA8510560ab41' as Address;

/** Lido WithdrawalQueueERC721 — used by Lido withdrawal request/claim templates. */
export const LIDO_WITHDRAWAL_QUEUE_ADDRESS =
  '0x889edC2eDab5f40e902b864aD4d7AdE8E412F9B1' as Address;

/** Mantle staking contract — used by mETH unstake request/claim templates. */
export const MANTLE_STAKING_ADDRESS =
  '0xe3cBd06D7dadB3F4e6557bAb7EdD924CD1489E8f' as Address;

/**
 * OpenSea Seaport (1.5 / 1.6) — the protocol contract that fulfills NFT
 * orders. Same address across 1.5 and 1.6 since Seaport uses deterministic
 * deployments. Used by `opensea-listing` and `marketplace-fulfill-seaport`
 * templates.
 */
export const SEAPORT_ADDRESS =
  '0x00000000000000ADc04C56Bf30aC9d3c0aAF14dC' as Address;

export const TREASURY_ADDRESS = NOUNS_ADDRESSES.treasury as Address;
export const NOUNS_TOKEN_ADDRESS = NOUNS_ADDRESSES.token as Address;
export const DAO_PROXY_ADDRESS = NOUNS_ADDRESSES.governor as Address;
export const STREAM_FACTORY_ADDRESS = '0x0fd206FC7A7dBcD5661157eDCb1FFDD0D02A61ff' as Address;
export const TOKEN_BUYER_ADDRESS = NOUNS_ADDRESSES.tokenBuyer as Address;
export const PAYER_ADDRESS = NOUNS_ADDRESSES.payer as Address;
export const DESCRIPTOR_ADDRESS = NOUNS_ADDRESSES.descriptor as Address;
export const AUCTION_HOUSE_ADDRESS = NOUNS_ADDRESSES.auctionHouse as Address;
export const CLIENT_REWARDS_ADDRESS = NOUNS_ADDRESSES.clientRewards as Address;
export const DATA_PROXY_ADDRESS = NOUNS_ADDRESSES.data as Address;
export const FORK_ESCROW_ADDRESS = NOUNS_ADDRESSES.forkEscrow as Address;

/**
 * Well-known ERC20Votes tokens, keyed by lowercase address.
 * Used to (1) round-trip delegate(address) calls back into templates with a
 * friendly symbol, and (2) filter the treasury-delegate token picker to
 * tokens we know support delegation. Extend as the treasury picks up new
 * votes-tokens.
 */
export const KNOWN_VOTES_TOKENS: Record<string, { symbol: string; decimals: number }> = {
  '0xc18360217d8f7ab5e7c516566761ea12ce7f9d72': { symbol: 'ENS', decimals: 18 },
  '0xc00e94cb662c3520282e6f5717214004a7f26888': { symbol: 'COMP', decimals: 18 },
  '0x1f9840a85d5af5bf1d1762f925bdaddc4201f984': { symbol: 'UNI', decimals: 18 },
  '0x912ce59144191c1204e64559fe8253a0e49e6548': { symbol: 'ARB', decimals: 18 },
};
