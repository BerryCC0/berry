/**
 * Treasury balance lookup. FN treasury holds only ETH per the user — keep it simple.
 */

'use client';

import { useBalance } from 'wagmi';
import { formatUnits } from 'viem';
import { FN_ADDRESSES, FN_CHAIN_ID } from '../contracts';

export function useFNTreasuryBalance() {
  const { data, isLoading, error, refetch } = useBalance({
    address: FN_ADDRESSES.treasury,
    chainId: FN_CHAIN_ID,
    query: {
      refetchInterval: 30_000,
    },
  });

  const wei = data?.value ?? BigInt(0);
  const decimals = data?.decimals ?? 18;

  return {
    wei,
    formatted: data ? formatUnits(wei, decimals) : '0',
    symbol: data?.symbol ?? 'ETH',
    isLoading,
    error,
    refetch,
  };
}
