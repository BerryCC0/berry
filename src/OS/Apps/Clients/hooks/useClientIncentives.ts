/**
 * Client Incentives Hooks
 * Fetches client incentives data from Ponder via Next.js API routes
 */

'use client';

import { useQuery } from '@tanstack/react-query';

// ============================================================================
// TYPES
// ============================================================================

export interface ClientData {
  clientId: number;
  name: string;
  description: string;
  approved: boolean;
  totalRewarded: string; // bigint as string (wei)
  totalWithdrawn: string;
  blockTimestamp: string;
  voteCount: number;
  proposalCount: number;
  auctionCount: number;
  auctionVolume: string;
  bidCount: number;
  bidVolume: string;
}

export interface RewardEvent {
  id: string;
  clientId: number;
  clientName: string;
  amount: string; // wei
  blockNumber: string;
  blockTimestamp: string;
}

export interface RewardUpdate {
  id: string;
  updateType: 'PROPOSAL' | 'AUCTION';
  blockNumber: string;
  blockTimestamp: string;
  // ProposalRewardsUpdated fields
  firstProposalId: string | null;
  lastProposalId: string | null;
  firstAuctionIdForRevenue: string | null;
  lastAuctionIdForRevenue: string | null;
  auctionRevenue: string | null;
  rewardPerProposal: string | null;
  rewardPerVote: string | null;
  // AuctionRewardsUpdated fields
  firstAuctionId: string | null;
  lastAuctionId: string | null;
}

export interface ClientVote {
  id: string;
  voter: string;
  proposal_id: number;
  support: number;
  votes: number;
  client_id: number;
  block_timestamp: string;
  client_name: string;
  proposal_title: string;
}

export interface ClientProposal {
  id: number;
  title: string;
  proposer: string;
  status: string;
  client_id: number;
  created_timestamp: string;
  client_name: string;
}

export interface ClientWithdrawal {
  id: string;
  client_id: number;
  amount: string;
  to_address: string;
  block_timestamp: string;
  client_name: string;
}

export interface ClientBid {
  id: string;
  noun_id: number;
  bidder: string;
  amount: string;
  client_id: number;
  block_timestamp: string;
  client_name: string;
}

export interface ClientActivity {
  votes: ClientVote[];
  proposals: ClientProposal[];
  withdrawals: ClientWithdrawal[];
  bids: ClientBid[];
}

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

  const response = await fetch(`/api/clients/activity?${params}`);
  if (!response.ok) throw new Error('Failed to fetch activity');
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
  });
}
