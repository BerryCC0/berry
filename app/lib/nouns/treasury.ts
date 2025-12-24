/**
 * Treasury Token Configuration
 * Tokens tracked in the Nouns DAO treasury
 */

export const TREASURY_TOKENS = {
  // Liquid Staking Tokens
  wstETH: {
    address: '0x7f39C581F595B53c5cb19bD0b3f8dA6c935E2Ca0' as const,
    symbol: 'wstETH',
    decimals: 18,
    name: 'Wrapped stETH',
    isEthDerivative: true,
  },
  stETH: {
    address: '0xae7ab96520DE3A18E5e111B5EaAb095312D7fE84' as const,
    symbol: 'stETH',
    decimals: 18,
    name: 'Lido Staked ETH',
    isEthDerivative: true,
  },
  rETH: {
    address: '0xae78736Cd615f374D3085123A210448E74Fc6393' as const,
    symbol: 'rETH',
    decimals: 18,
    name: 'Rocket Pool ETH',
    isEthDerivative: true,
  },
  mETH: {
    address: '0xd5F7838F5C461fefF7FE49ea5ebaF7728bB0ADfa' as const,
    symbol: 'mETH',
    decimals: 18,
    name: 'Mantle Staked ETH',
    isEthDerivative: true,
  },
  
  // Wrapped ETH
  WETH: {
    address: '0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2' as const,
    symbol: 'WETH',
    decimals: 18,
    name: 'Wrapped Ether',
    isEthDerivative: true,
  },
  
  // Stablecoins
  USDC: {
    address: '0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48' as const,
    symbol: 'USDC',
    decimals: 6,
    name: 'USD Coin',
    isEthDerivative: false,
  },
} as const;

export type TreasuryTokenSymbol = keyof typeof TREASURY_TOKENS;
export type TreasuryToken = typeof TREASURY_TOKENS[TreasuryTokenSymbol];

/**
 * Get all ETH derivative tokens (for calculating total ETH equivalent)
 */
export function getEthDerivatives(): TreasuryToken[] {
  return Object.values(TREASURY_TOKENS).filter(token => token.isEthDerivative);
}

/**
 * Get all stablecoin tokens
 */
export function getStablecoins(): TreasuryToken[] {
  return Object.values(TREASURY_TOKENS).filter(token => !token.isEthDerivative);
}

