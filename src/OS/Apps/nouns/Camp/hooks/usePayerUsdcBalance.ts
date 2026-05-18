'use client';

/**
 * usePayerUsdcBalance
 *
 * Reads the Nouns DAO Payer contract's current USDC balance via balanceOf().
 * Used by the payment-once template to show proposers how much USDC the Payer
 * holds in reserves before submitting — payments that exceed reserves are
 * silently queued as debt instead of reverting.
 */

import { useReadContract } from 'wagmi';
import { erc20Abi } from 'viem';
import { NOUNS_ADDRESSES } from '@/app/lib/nouns/contracts';

const USDC = '0xa0b86991c6218b36c1d19d4a2e9eb0ce3606eb48' as `0x${string}`;
const PAYER = NOUNS_ADDRESSES.payer as `0x${string}`;

export interface UsePayerUsdcBalanceResult {
  /** Raw USDC balance as a bigint (6 decimals). Undefined while loading or on error. */
  balance: bigint | undefined;
  isLoading: boolean;
  error: Error | null;
}

export function usePayerUsdcBalance(): UsePayerUsdcBalanceResult {
  const { data, isLoading, error } = useReadContract({
    address: USDC,
    abi: erc20Abi,
    functionName: 'balanceOf',
    args: [PAYER],
  });

  return {
    balance: data as bigint | undefined,
    isLoading,
    error: (error as Error | null) ?? null,
  };
}
