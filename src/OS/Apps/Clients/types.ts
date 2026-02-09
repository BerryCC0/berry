/**
 * Shared types for Client Incentives
 */

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
