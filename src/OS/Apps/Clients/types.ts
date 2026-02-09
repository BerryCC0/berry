/**
 * Shared types for Client Incentives
 */

import { CLIENT_REGISTRY } from '@/OS/lib/clientNames';

// ============================================================================
// Route Types - URL-based navigation
// ============================================================================

export type DashboardTab = 'auctions' | 'proposals' | 'leaderboard';
export type ClientTab = 'votes' | 'proposals' | 'bids' | 'withdrawals' | 'rewards';

export type ClientsRoute =
  | { view: 'dashboard'; tab?: DashboardTab }
  | { view: 'client'; clientId: number; tab?: ClientTab };

/** Reserved path segments that map to dashboard tabs (not client slugs) */
const DASHBOARD_TABS = new Set<string>(['auctions', 'proposals', 'leaderboard']);

/** Valid client detail tab names */
const CLIENT_TABS = new Set<string>(['votes', 'proposals', 'bids', 'withdrawals', 'rewards']);

/**
 * Slugify a client name for use in URLs
 * e.g. "Berry OS" → "berry-os", "Nouns.biz" → "nouns-biz"
 */
export function slugifyClientName(name: string): string {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

/**
 * Build a reverse lookup map from slug → clientId
 * Uses CLIENT_REGISTRY (static) + optional on-chain client list (dynamic)
 */
function buildSlugMap(clients?: { clientId: number; name: string }[]): Map<string, number> {
  const map = new Map<string, number>();

  // Static registry first
  for (const [idStr, info] of Object.entries(CLIENT_REGISTRY)) {
    const slug = slugifyClientName(info.name);
    if (slug && !DASHBOARD_TABS.has(slug)) {
      map.set(slug, Number(idStr));
    }
  }

  // Dynamic on-chain names override / extend
  if (clients) {
    for (const c of clients) {
      if (c.name) {
        const slug = slugifyClientName(c.name);
        if (slug && !DASHBOARD_TABS.has(slug)) {
          map.set(slug, c.clientId);
        }
      }
    }
  }

  return map;
}

/**
 * Find a client ID from a URL slug
 * Checks CLIENT_REGISTRY first, then optional on-chain client list
 */
export function findClientBySlug(
  slug: string,
  clients?: { clientId: number; name: string }[],
): number | null {
  const map = buildSlugMap(clients);
  return map.get(slug) ?? null;
}

/**
 * Parse a URL path into a ClientsRoute
 * @param path - Path segments after /clients/ (e.g. "berry-os/votes")
 * @param clients - Optional client list for name slug resolution
 */
export function parseClientsRoute(
  path?: string,
  clients?: { clientId: number; name: string }[],
): ClientsRoute {
  if (!path) return { view: 'dashboard' };

  const parts = path.split('/').filter(Boolean);
  if (parts.length === 0) return { view: 'dashboard' };

  const first = parts[0];

  // Check if first segment is a dashboard tab
  if (DASHBOARD_TABS.has(first)) {
    return { view: 'dashboard', tab: first as DashboardTab };
  }

  // Check if first segment is a numeric client ID
  const numId = parseInt(first, 10);
  if (!isNaN(numId) && numId >= 0) {
    const tab = parts[1] && CLIENT_TABS.has(parts[1]) ? (parts[1] as ClientTab) : undefined;
    return { view: 'client', clientId: numId, tab };
  }

  // Try to resolve as a client name slug
  const clientId = findClientBySlug(first, clients);
  if (clientId !== null) {
    const tab = parts[1] && CLIENT_TABS.has(parts[1]) ? (parts[1] as ClientTab) : undefined;
    return { view: 'client', clientId, tab };
  }

  // Unrecognised path — fall back to dashboard
  return { view: 'dashboard' };
}

/**
 * Convert a ClientsRoute back to a URL path (without the /clients/ prefix)
 * @param route - The route to serialize
 * @param clients - Optional client list to resolve names for prettier URLs
 */
export function clientsRouteToPath(
  route: ClientsRoute,
  clients?: { clientId: number; name: string }[],
): string {
  if (route.view === 'dashboard') {
    return route.tab ?? '';
  }

  // Try to use a name slug for prettier URLs
  let identifier = String(route.clientId);
  const registryEntry = CLIENT_REGISTRY[route.clientId];
  if (registryEntry) {
    identifier = slugifyClientName(registryEntry.name);
  } else if (clients) {
    const client = clients.find((c) => c.clientId === route.clientId);
    if (client?.name) {
      identifier = slugifyClientName(client.name);
    }
  }

  if (route.tab) {
    return `${identifier}/${route.tab}`;
  }
  return identifier;
}

// ============================================================================
// Core data types (from Ponder API)
// ============================================================================

export interface ClientData {
  clientId: number;
  name: string;
  description: string;
  approved: boolean;
  totalRewarded: string; // bigint as string (wei)
  totalWithdrawn: string;
  nftImage: string | null; // on-chain NFT image (SVG data URI), indexed by Ponder
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
  for_votes: number;
  against_votes: number;
  abstain_votes: number;
  quorum_votes: string;
  start_block: string;
  end_block: string;
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
// Cycle votes
// ============================================================================

export interface CycleVoteEntry {
  clientId: number;
  name: string;
  voteCount: number;
}

export interface CycleProposalVoteEntry {
  proposalId: number;
  clientId: number;
  name: string;
  voteCount: number;
}

export interface CycleVotesResponse {
  votes: CycleVoteEntry[];
  votesByProposal: CycleProposalVoteEntry[];
}

// ============================================================================
// Cycle auctions
// ============================================================================

export interface CycleAuction {
  nounId: number;
  winner: string;
  amount: string;
  winningBidClientId: number | null;
  clientName: string | null;
}

export interface CycleAuctionClientEntry {
  clientId: number;
  name: string;
  bidCount?: number;
  bidVolume?: string;
  winCount?: number;
  winVolume?: string;
}

export interface CycleAuctionsResponse {
  auctions: CycleAuction[];
  bidsByClient: CycleAuctionClientEntry[];
  winsByClient: CycleAuctionClientEntry[];
}

// ============================================================================
// Chart / computed data types
// ============================================================================

export interface Totals {
  rewarded: number;
  withdrawn: number;
  balance: number;
  count: number;
  bids: number;
}

export interface DistributionItem {
  clientId: number;
  name: string;
  count: number;
  pct: number;
  color: string;
}

export interface RewardEconDataPoint {
  label: string;
  date: string;
  rewardPerProposal: number;
  rewardPerVote: number;
  rewardPerAuction: number;
}

export interface RevenueDataPoint {
  label: string;
  date: string;
  revenue: number;
  rewardPerProposal: number;
}

export interface ProposalBreakdownEntry {
  clientId: number;
  name: string;
  voteCount: number;
  estimatedVoteReward: number;
  isProposer: boolean;
  estimatedProposalReward: number;
}

// ============================================================================
// Client metadata
// ============================================================================

export interface ClientMetadataEntry {
  favicon?: string;
  title?: string;
  description?: string;
}

export type ClientMetadataMap = Map<number, ClientMetadataEntry>;

// ============================================================================
// Cycle progress / countdown
// ============================================================================

export interface CycleProgress {
  minimumRewardPeriod: number;        // seconds
  numProposalsEnoughForReward: number;
  lastUpdateTimestamp: number;        // unix seconds
  timeElapsed: number;                // seconds since last update
  timeRemaining: number | null;       // seconds until minimumRewardPeriod met (null if already met)
  proposalConditionMet: boolean;      // eligible >= numProposalsEnoughForReward
  timeConditionMet: boolean;          // timeElapsed >= minimumRewardPeriod
  pendingCount: number;               // proposals still voting (could become eligible)
  qualifyingPendingCount: number;     // pending proposals created after deadline (would satisfy time condition)
  canDistribute: boolean;              // either condition met
}

// ============================================================================
// Cycle rewards aggregation
// ============================================================================

export interface CycleRewardEntry {
  clientId: number;
  name: string;
  reward: number;
  color: string;
}
