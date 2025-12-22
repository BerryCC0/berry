"use client";

/**
 * useTokenBalances Hook
 * Fetches all token balances for a wallet address using Moralis API
 */

import { useState, useEffect } from "react";

export interface TokenBalance {
  symbol: string;
  name: string;
  balance: string;
  decimals: number;
  isNative: boolean;
  logo: string | null;
  contractAddress?: string;
}

interface TokenBalancesResult {
  native: TokenBalance | null;
  tokens: TokenBalance[];
  isLoading: boolean;
  error: string | null;
  refetch: () => void;
}

export function useTokenBalances(
  address: string | undefined,
  chainId: number | undefined
): TokenBalancesResult {
  const [native, setNative] = useState<TokenBalance | null>(null);
  const [tokens, setTokens] = useState<TokenBalance[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [fetchTrigger, setFetchTrigger] = useState(0);

  useEffect(() => {
    if (!address) {
      setNative(null);
      setTokens([]);
      return;
    }

    const fetchBalances = async () => {
      setIsLoading(true);
      setError(null);

      try {
        const params = new URLSearchParams({
          address,
          ...(chainId && { chainId: chainId.toString() }),
        });

        const response = await fetch(`/api/tokens?${params}`);

        if (!response.ok) {
          const errorData = await response.json();
          throw new Error(errorData.error || "Failed to fetch balances");
        }

        const data = await response.json();
        setNative(data.native);
        setTokens(data.tokens);
      } catch (err) {
        console.error("[useTokenBalances] Error:", err);
        setError(err instanceof Error ? err.message : "Unknown error");
      } finally {
        setIsLoading(false);
      }
    };

    fetchBalances();
  }, [address, chainId, fetchTrigger]);

  const refetch = () => setFetchTrigger((prev) => prev + 1);

  return { native, tokens, isLoading, error, refetch };
}

/**
 * Format token balance for display
 */
export function formatTokenBalance(balance: string, decimals: number): string {
  if (!balance || balance === "0") return "0";

  const value = BigInt(balance);
  const divisor = BigInt(10 ** decimals);
  const integerPart = value / divisor;
  const fractionalPart = value % divisor;

  // Format with up to 4 decimal places
  const fractionalStr = fractionalPart.toString().padStart(decimals, "0");
  const displayFractional = fractionalStr.slice(0, 4).replace(/0+$/, "");

  if (displayFractional) {
    return `${integerPart.toLocaleString()}.${displayFractional}`;
  }

  return integerPart.toLocaleString();
}

