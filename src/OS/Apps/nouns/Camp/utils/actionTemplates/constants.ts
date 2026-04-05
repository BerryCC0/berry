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
];

export const EXTERNAL_CONTRACTS = {
  USDC: { address: '0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48' as Address },
  WETH: { address: '0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2' as Address },
  DAI: { address: '0x6B175474E89094C44Da98b954EedeAC495271d0F' as Address },
};

export const TREASURY_ADDRESS = NOUNS_ADDRESSES.treasury as Address;
export const NOUNS_TOKEN_ADDRESS = NOUNS_ADDRESSES.token as Address;
export const DAO_PROXY_ADDRESS = NOUNS_ADDRESSES.governor as Address;
export const STREAM_FACTORY_ADDRESS = '0x0fd206FC7A7dBcD5661157eDCb1FFDD0D02A61ff' as Address;
