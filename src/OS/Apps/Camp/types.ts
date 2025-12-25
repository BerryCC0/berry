/**
 * Camp Type Definitions
 * Types for Nouns governance app
 */

// ============================================================================
// Route Types - URL-based navigation
// ============================================================================

export type CampRoute =
  | { view: 'activity' }
  | { view: 'proposals' }
  | { view: 'proposal'; id: string }
  | { view: 'candidates' }
  | { view: 'candidate'; proposer: string; slug: string }
  | { view: 'voters' }
  | { view: 'voter'; address: string }
  | { view: 'vote'; proposalId: string; voter: string }
  | { view: 'account' }
  | { view: 'create' };

export function parseRoute(path?: string): CampRoute {
  if (!path) return { view: 'activity' };
  
  const parts = path.split('/').filter(Boolean);
  
  if (parts.length === 0) return { view: 'activity' };
  
  switch (parts[0]) {
    case 'proposals':
      return { view: 'proposals' };
    case 'proposal':
      if (parts[1]) return { view: 'proposal', id: parts[1] };
      return { view: 'proposals' };
    case 'candidates':
      return { view: 'candidates' };
    case 'candidate':
      if (parts[1] && parts[2]) {
        return { view: 'candidate', proposer: parts[1], slug: parts.slice(2).join('/') };
      }
      return { view: 'candidates' };
    case 'voters':
      return { view: 'voters' };
    case 'voter':
      if (parts[1]) return { view: 'voter', address: parts[1] };
      return { view: 'voters' };
    case 'vote':
      if (parts[1] && parts[2]) {
        return { view: 'vote', proposalId: parts[1], voter: parts[2] };
      }
      return { view: 'activity' };
    case 'account':
      return { view: 'account' };
    case 'create':
      return { view: 'create' };
    default:
      return { view: 'activity' };
  }
}

export function routeToPath(route: CampRoute): string {
  switch (route.view) {
    case 'activity':
      return '';
    case 'proposals':
      return 'proposals';
    case 'proposal':
      return `proposal/${route.id}`;
    case 'candidates':
      return 'candidates';
    case 'candidate':
      return `candidate/${route.proposer}/${route.slug}`;
    case 'voters':
      return 'voters';
    case 'voter':
      return `voter/${route.address}`;
    case 'vote':
      return `vote/${route.proposalId}/${route.voter}`;
    case 'account':
      return 'account';
    case 'create':
      return 'create';
  }
}

// ============================================================================
// Proposal Types
// ============================================================================

export interface Proposal {
  id: string;
  title: string;
  description: string;
  status: ProposalStatus;
  proposer: string;
  forVotes: string;
  againstVotes: string;
  abstainVotes: string;
  quorumVotes: string;
  startBlock: string;
  endBlock: string;
  createdTimestamp: string;
  createdBlock: string;
  executionETA?: string;
  totalSupply?: string;
}

export type ProposalStatus =
  | 'PENDING'
  | 'ACTIVE'
  | 'CANCELLED'
  | 'DEFEATED'
  | 'SUCCEEDED'
  | 'QUEUED'
  | 'EXPIRED'
  | 'EXECUTED'
  | 'VETOED'
  | 'OBJECTION_PERIOD'
  | 'UPDATABLE';

// ============================================================================
// Vote Types
// ============================================================================

export interface Vote {
  id: string;
  voter: string;
  proposalId: string;
  support: number; // 0=Against, 1=For, 2=Abstain
  votes: string;
  reason?: string;
  blockTimestamp: string;
  txHash?: string;
}

export type VoteSupport = 0 | 1 | 2;

export function getSupportLabel(support: number): string {
  switch (support) {
    case 0: return 'Against';
    case 1: return 'For';
    case 2: return 'Abstain';
    default: return 'Unknown';
  }
}

export function getSupportColor(support: number): string {
  switch (support) {
    case 0: return '#e53935'; // Red
    case 1: return '#43a047'; // Green
    case 2: return '#757575'; // Gray
    default: return '#757575';
  }
}

// ============================================================================
// Voter/Delegate Types
// ============================================================================

export interface Voter {
  id: string; // Address
  delegatedVotes: string;
  tokenHoldersRepresentedAmount: number;
  nounsRepresented: { id: string }[];
  votes: Vote[];
}

// ============================================================================
// Candidate Types
// ============================================================================

export interface Candidate {
  id: string;
  proposer: string;
  slug: string;
  title?: string;
  description: string;
  createdTimestamp: string;
  lastUpdatedTimestamp: string;
  canceled: boolean;
  proposalIdToUpdate?: string;
}

export interface CandidateFeedback {
  id: string;
  voter: string;
  support: number;
  reason: string;
  createdTimestamp: string;
}

// ============================================================================
// Activity Feed Types
// ============================================================================

export type ActivityType =
  | 'vote'
  | 'proposal_feedback'
  | 'candidate_feedback'
  | 'proposal_created'
  | 'proposal_queued'
  | 'proposal_executed';

export interface ActivityItem {
  id: string;
  type: ActivityType;
  timestamp: string;
  actor: string;
  
  // Context depends on type
  proposalId?: string;
  proposalTitle?: string;
  candidateSlug?: string;
  candidateProposer?: string;
  
  // Vote-specific
  support?: number;
  votes?: string;
  reason?: string;
}

// ============================================================================
// Filter/Sort Types
// ============================================================================

export type ProposalFilter = 'all' | 'active' | 'pending' | 'succeeded' | 'defeated' | 'executed';
export type ProposalSort = 'newest' | 'oldest' | 'ending_soon';
export type VoterSort = 'votes' | 'power' | 'represented';

