/**
 * useTokenMetadata
 * Fetch the symbol / decimals / name of any ERC-20 contract address.
 * Lightweight — three on-chain reads in parallel, no IPFS or off-chain lookups.
 */

'use client';

import { useReadContracts } from 'wagmi';
import { isAddress, type Address } from 'viem';
import { MINIMAL_ERC20_ABI } from '../utils/actionTemplates/constants';

export interface TokenMetadata {
  symbol: string | undefined;
  decimals: number | undefined;
  name: string | undefined;
  isLoading: boolean;
  isError: boolean;
}

export function useTokenMetadata(address: string | undefined): TokenMetadata {
  const enabled = !!address && isAddress(address);

  const { data, isLoading, isError } = useReadContracts({
    contracts: enabled
      ? [
          {
            address: address as Address,
            abi: MINIMAL_ERC20_ABI,
            functionName: 'symbol' as const,
          },
          {
            address: address as Address,
            abi: MINIMAL_ERC20_ABI,
            functionName: 'decimals' as const,
          },
          {
            address: address as Address,
            abi: MINIMAL_ERC20_ABI,
            functionName: 'name' as const,
          },
        ]
      : [],
    query: { enabled, staleTime: 5 * 60 * 1000 }, // 5 min — metadata is effectively immutable
  });

  const symbol =
    data?.[0]?.status === 'success' ? (data[0].result as string) : undefined;
  const decimals =
    data?.[1]?.status === 'success'
      ? Number(data[1].result as number)
      : undefined;
  const name =
    data?.[2]?.status === 'success' ? (data[2].result as string) : undefined;

  return { symbol, decimals, name, isLoading, isError };
}
