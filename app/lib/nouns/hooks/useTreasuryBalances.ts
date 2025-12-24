/**
 * Treasury Balances Hook
 * Fetch ETH and token balances from Nouns treasury
 */

import { useReadContracts, useBalance } from 'wagmi';
import { formatUnits, formatEther } from 'viem';
import { NOUNS_ADDRESSES, ERC20ABI } from '../contracts';
import { TREASURY_TOKENS, type TreasuryTokenSymbol } from '../treasury';

interface TokenBalance {
  raw: bigint;
  formatted: string;
  symbol: string;
  name: string;
}

export interface TreasuryBalances {
  eth: {
    raw: bigint;
    formatted: string;
  };
  tokens: Partial<Record<TreasuryTokenSymbol, TokenBalance>>;
  ethEquivalent: {
    raw: bigint;
    formatted: string;
  };
  isLoading: boolean;
  error: Error | null;
}

/**
 * Fetch all treasury balances (v2 treasury)
 */
export function useTreasuryBalances(): TreasuryBalances {
  const treasuryAddress = NOUNS_ADDRESSES.treasury;

  // ETH balance
  const { data: ethBalance, isLoading: ethLoading, error: ethError } = useBalance({
    address: treasuryAddress,
  });

  // ERC-20 balances
  const tokenEntries = Object.entries(TREASURY_TOKENS) as [TreasuryTokenSymbol, typeof TREASURY_TOKENS[TreasuryTokenSymbol]][];
  
  const tokenCalls = tokenEntries.map(([, token]) => ({
    address: token.address,
    abi: ERC20ABI,
    functionName: 'balanceOf' as const,
    args: [treasuryAddress] as const,
  }));

  const { data: tokenBalances, isLoading: tokensLoading, error: tokensError } = useReadContracts({
    contracts: tokenCalls,
  });

  // Format results
  const tokens: Partial<Record<TreasuryTokenSymbol, TokenBalance>> = {};
  let ethEquivalentRaw = ethBalance?.value ?? BigInt(0);

  if (tokenBalances) {
    tokenEntries.forEach(([symbol, tokenConfig], index) => {
      const result = tokenBalances[index];

      if (result.status === 'success' && result.result !== undefined) {
        const raw = result.result as bigint;
        tokens[symbol] = {
          raw,
          formatted: formatUnits(raw, tokenConfig.decimals),
          symbol: tokenConfig.symbol,
          name: tokenConfig.name,
        };

        // Add to ETH equivalent if it's an ETH derivative
        if (tokenConfig.isEthDerivative) {
          ethEquivalentRaw += raw;
        }
      }
    });
  }

  return {
    eth: {
      raw: ethBalance?.value ?? BigInt(0),
      formatted: ethBalance ? formatEther(ethBalance.value) : '0',
    },
    tokens,
    ethEquivalent: {
      raw: ethEquivalentRaw,
      formatted: formatEther(ethEquivalentRaw),
    },
    isLoading: ethLoading || tokensLoading,
    error: ethError || tokensError || null,
  };
}

/**
 * Fetch V1 treasury balances (legacy treasury)
 */
export function useTreasuryV1Balances() {
  const treasuryV1Address = NOUNS_ADDRESSES.treasuryV1;

  const { data: ethBalance, isLoading, error } = useBalance({
    address: treasuryV1Address,
  });

  return {
    eth: {
      raw: ethBalance?.value ?? BigInt(0),
      formatted: ethBalance ? formatEther(ethBalance.value) : '0',
    },
    isLoading,
    error,
  };
}

