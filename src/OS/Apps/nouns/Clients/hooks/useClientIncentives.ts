/**
 * Client Incentives Hooks
 * Fetches client incentives data from Ponder via Next.js API routes
 */

'use client';

import { useQuery } from '@tanstack/react-query';
import type {
  ClientData,
  RewardEvent,
  RewardUpdate,
  ClientActivity,
  CycleVotesResponse,
  CycleAuctionsResponse,
} from '../types';

// Re-export types for convenience
export type {
  ClientData,
  RewardEvent,
  RewardUpdate,
  ClientActivity,
  CycleVoteEntry,
  CycleProposalVoteEntry,
  CycleVotesResponse,
  CycleAuction,
  CycleAuctionClientEntry,
  CycleAuctionsResponse,
} from '../types';

// ============================================================================
// FETCH FUNCTIONS
// ============================================================================

async function fetchClients(): Promise<ClientData[]> {
  const response = await fetch('/api/clients');
  if (!response.ok) throw new Error('Failed to fetch clients');
  const json = await response.json();
  return json.clients;
}

async function fetchRewardsTimeSeries(clientId?: number): Promise<RewardEvent[]> {
  const params = new URLSearchParams();
  if (clientId !== undefined) params.set('clientId', String(clientId));
  params.set('limit', '5000');

  const response = await fetch(`/api/clients/rewards?${params}`);
  if (!response.ok) throw new Error('Failed to fetch rewards');
  const json = await response.json();
  return json.rewards;
}

async function fetchClientActivity(clientId?: number): Promise<ClientActivity> {
  const params = new URLSearchParams();
  if (clientId !== undefined) params.set('clientId', String(clientId));
  params.set('limit', '100');
  params.set('voteLimit', '500');
  params.set('proposalLimit', '500');

  const response = await fetch(`/api/clients/activity?${params}`);
  if (!response.ok) throw new Error('Failed to fetch activity');
  return response.json();
}

async function fetchCycleVotes(proposalIds?: number[]): Promise<CycleVotesResponse> {
  const params = new URLSearchParams();
  // If explicit IDs provided, pass them; otherwise let the server auto-determine
  if (proposalIds && proposalIds.length > 0) {
    params.set('proposalIds', proposalIds.join(','));
  }

  // Abort if the endpoint hasn't responded in 15s so we don't hang forever
  // (the server-side RPC call can stall on flaky public endpoints).
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 15_000);
  try {
    const response = await fetch(`/api/clients/cycle-votes?${params}`, {
      signal: controller.signal,
    });
    if (!response.ok) {
      const body = await response.text().catch(() => '');
      throw new Error(`cycle-votes ${response.status}: ${body.slice(0, 200)}`);
    }
    const json = await response.json();
    return { votes: json.votes, votesByProposal: json.votesByProposal };
  } finally {
    clearTimeout(timeout);
  }
}

async function fetchCycleAuctions(firstNounId: number): Promise<CycleAuctionsResponse> {
  const params = new URLSearchParams({ firstNounId: String(firstNounId) });
  const response = await fetch(`/api/clients/cycle-auctions?${params}`);
  if (!response.ok) throw new Error('Failed to fetch cycle auctions');
  return response.json();
}

async function fetchRewardUpdates(type?: 'PROPOSAL' | 'AUCTION'): Promise<RewardUpdate[]> {
  const params = new URLSearchParams();
  if (type) params.set('type', type);
  params.set('limit', '500');

  const response = await fetch(`/api/clients/updates?${params}`);
  if (!response.ok) throw new Error('Failed to fetch reward updates');
  const json = await response.json();
  return json.updates;
}

// ============================================================================
// HOOKS
// ============================================================================

/**
 * Fetch all registered clients with their totals and counts
 */
export function useClients() {
  return useQuery({
    queryKey: ['clients', 'list'],
    queryFn: fetchClients,
    staleTime: 60000, // 1 min
    refetchOnMount: false,
    refetchOnWindowFocus: false,
  });
}

/**
 * Fetch reward events time series for charting
 */
export function useClientRewardsTimeSeries(clientId?: number) {
  return useQuery({
    queryKey: ['clients', 'rewards', clientId ?? 'all'],
    queryFn: () => fetchRewardsTimeSeries(clientId),
    staleTime: 120000, // 2 min
    refetchOnMount: false,
    refetchOnWindowFocus: false,
  });
}

/**
 * Fetch recent client activity (votes, proposals, withdrawals, bids)
 */
export function useClientActivity(clientId?: number) {
  return useQuery({
    queryKey: ['clients', 'activity', clientId ?? 'all'],
    queryFn: () => fetchClientActivity(clientId),
    staleTime: 60000,
    refetchOnMount: false,
    refetchOnWindowFocus: false,
  });
}

/**
 * Fetch reward update events (ProposalRewardsUpdated / AuctionRewardsUpdated)
 */
export function useRewardUpdates(type?: 'PROPOSAL' | 'AUCTION') {
  return useQuery({
    queryKey: ['clients', 'updates', type ?? 'all'],
    queryFn: () => fetchRewardUpdates(type),
    staleTime: 120000,
    refetchOnMount: false,
    refetchOnWindowFocus: false,
  });
}

/**
 * Fetch vote weight per client for the current reward cycle.
 * When called without args (or undefined), the server auto-determines eligible proposals
 * from Ponder DB — no need to wait for client-side contract reads.
 * When called with explicit IDs, uses those IDs directly.
 */
export function useCycleVotes(proposalIds?: number[]) {
  return useQuery<CycleVotesResponse>({
    queryKey: ['clients', 'cycle-votes', proposalIds ?? 'auto'],
    queryFn: () => fetchCycleVotes(proposalIds),
    staleTime: 60000,
    refetchOnMount: false,
    refetchOnWindowFocus: false,
    retry: 2,
    retryDelay: (attempt) => Math.min(1500 * 2 ** attempt, 8000),
  });
}

/**
 * Fetch current cycle auction data (bids/wins by client, auction list)
 */
export function useCycleAuctions(firstNounId: number | undefined) {
  return useQuery<CycleAuctionsResponse>({
    queryKey: ['clients', 'cycle-auctions', firstNounId],
    queryFn: () => fetchCycleAuctions(firstNounId!),
    staleTime: 60000,
    refetchOnMount: false,
    refetchOnWindowFocus: false,
    enabled: firstNounId != null,
  });
}
