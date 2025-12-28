/**
 * ETH Price Hook
 * Fetches current ETH price in USD from CoinGecko
 */

import { useQuery } from '@tanstack/react-query';

interface EthPriceResult {
  price: number;
  isLoading: boolean;
  error: Error | null;
}

async function fetchEthPrice(): Promise<number> {
  const response = await fetch(
    'https://api.coingecko.com/api/v3/simple/price?ids=ethereum&vs_currencies=usd'
  );
  
  if (!response.ok) {
    throw new Error('Failed to fetch ETH price');
  }
  
  const data = await response.json();
  return data.ethereum.usd;
}

export function useEthPrice(): EthPriceResult {
  const { data, isLoading, error } = useQuery({
    queryKey: ['ethPrice'],
    queryFn: fetchEthPrice,
    staleTime: 60000, // 1 minute
    refetchInterval: 60000, // Refresh every minute
  });

  return {
    price: data ?? 0,
    isLoading,
    error: error as Error | null,
  };
}
