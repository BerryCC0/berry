/**
 * useSalePrice
 * Lazily checks whether a Noun transfer was a sale by querying the sale detection API.
 * Results are cached forever per txHash since sale data is immutable.
 */

import { useQuery } from '@tanstack/react-query';

interface SalePriceResult {
  isSale: boolean;
  salePrice: string | null;
  isLoading: boolean;
}

async function fetchSalePrice(txHash: string, seller: string): Promise<{ isSale: boolean; price: string | null }> {
  const params = new URLSearchParams({ txHash });
  if (seller) params.set('seller', seller);

  const res = await fetch(`/api/nouns/sale?${params.toString()}`);
  if (!res.ok) return { isSale: false, price: null };
  return res.json();
}

export function useSalePrice(txHash?: string, seller?: string): SalePriceResult {
  const { data, isLoading } = useQuery({
    queryKey: ['noun-sale', txHash],
    queryFn: () => fetchSalePrice(txHash!, seller || ''),
    enabled: !!txHash,
    staleTime: Infinity,
    gcTime: 10 * 60 * 1000, // keep in cache for 10 minutes
  });

  return {
    isSale: data?.isSale ?? false,
    salePrice: data?.price ?? null,
    isLoading: !!txHash && isLoading,
  };
}
