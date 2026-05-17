/**
 * Treasury Activity Hooks
 *
 * Read-only React Query wrappers around /api/nouns/treasury/* routes.
 * Each hook returns the typed response shape from its route module.
 */

'use client';

import { useQuery } from '@tanstack/react-query';
import type { TreasuryTxsResponse } from '@/app/api/nouns/treasury/transactions/route';
import type { StreamsResponse } from '@/app/api/nouns/treasury/streams/route';
import type { TokenBuyerTradesResponse } from '@/app/api/nouns/treasury/token-buyer-trades/route';
import type { ClientRewardsResponse } from '@/app/api/nouns/treasury/client-rewards/route';
import type { TreasuryBalancesResponse } from '@/app/api/nouns/treasury/balances/route';

const STALE_TIME = 60_000;

async function fetchJson<T>(url: string): Promise<T> {
  const res = await fetch(url);
  if (!res.ok) throw new Error(`Request failed: ${url} (${res.status})`);
  return (await res.json()) as T;
}

export function useTreasuryTransactions() {
  return useQuery<TreasuryTxsResponse>({
    queryKey: ['treasury-transactions'],
    queryFn: () => fetchJson<TreasuryTxsResponse>('/api/nouns/treasury/transactions'),
    staleTime: STALE_TIME,
  });
}

export function useTreasuryStreams() {
  return useQuery<StreamsResponse>({
    queryKey: ['treasury-streams'],
    queryFn: () => fetchJson<StreamsResponse>('/api/nouns/treasury/streams'),
    staleTime: STALE_TIME,
  });
}

export function useTokenBuyerTrades() {
  return useQuery<TokenBuyerTradesResponse>({
    queryKey: ['treasury-token-buyer-trades'],
    queryFn: () => fetchJson<TokenBuyerTradesResponse>('/api/nouns/treasury/token-buyer-trades'),
    staleTime: STALE_TIME,
  });
}

export function useTreasuryClientRewards() {
  return useQuery<ClientRewardsResponse>({
    queryKey: ['treasury-client-rewards'],
    queryFn: () => fetchJson<ClientRewardsResponse>('/api/nouns/treasury/client-rewards'),
    staleTime: STALE_TIME,
  });
}

/**
 * Server-side treasury valuation backed by Alchemy.
 * Returns real USD prices (matches Etherscan) and discovers all ERC-20
 * holdings above the dust filter, not just the hand-curated allowlist.
 */
export function useTreasuryFullBalances() {
  return useQuery<TreasuryBalancesResponse>({
    queryKey: ['treasury-full-balances'],
    queryFn: () => fetchJson<TreasuryBalancesResponse>('/api/nouns/treasury/balances'),
    staleTime: STALE_TIME,
  });
}

export type {
  TreasuryTxsResponse,
  StreamsResponse,
  TokenBuyerTradesResponse,
  ClientRewardsResponse,
  TreasuryBalancesResponse,
};
