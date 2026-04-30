/**
 * useVoters Hook
 * Fetches delegates/voters from Ponder API
 */

'use client';

import { useQuery, useInfiniteQuery } from '@tanstack/react-query';
import type { Voter, VoterSort, NounWithSeed } from '../types';

/** Default page size for paginated voter queries */
export const VOTERS_PAGE_SIZE = 50;

// ============================================================================
// TYPES
// ============================================================================

/**
 * Raw SQL row for a voter in list view
 */
interface ApiVoterListRow {
  address: string;
  ens_name: string | null;
  delegated_votes: string;
  nouns_represented: number[];
  total_votes: string;
  last_vote_at: number | null;
  first_seen_at: number | null;
}

/**
 * Raw vote object from detail response (already camelCase from API)
 */
interface ApiRecentVote {
  id: string;
  voter: string;
  proposalId: string;
  proposalTitle: string;
  support: number;
  votes: string;
  reason: string | null;
  blockTimestamp: number;
}

/**
 * Raw noun with seed from detail response (already camelCase from API)
 */
interface ApiNounOwned {
  id: number;
  seed: {
    background: number;
    body: number;
    accessory: number;
    head: number;
    glasses: number;
  };
}

/**
 * Summary objects from voter detail response (already camelCase)
 */
interface ProposalSummary {
  id: string;
  title: string;
  status: string;
  forVotes: string;
  againstVotes: string;
  abstainVotes: string;
  quorumVotes: string;
  startBlock: string;
  endBlock: string;
  createdTimestamp: string;
  signers: string[];
}

interface CandidateSummary {
  id: string;
  slug: string;
  proposer: string;
  title: string;
  createdTimestamp: string;
}

interface SponsoredProposal {
  id: string;
  title: string;
  status: string;
  proposer: string;
  forVotes: string;
  againstVotes: string;
  abstainVotes: string;
  quorumVotes: string;
  startBlock: string;
  endBlock: string;
  createdTimestamp: string;
}

/**
 * Noun delegated to a voter (with seed and current owner).
 * The owner is the *current* delegator for this Noun.
 */
interface ApiNounRepresented {
  id: number;
  seed: {
    background: number;
    body: number;
    accessory: number;
    head: number;
    glasses: number;
  };
  owner: string | null;
}

/**
 * Full voter detail response from API (already camelCase)
 */
interface ApiVoterDetailResponse {
  id: string;
  delegatedVotes: string;
  totalVotes: string;
  ensName: string | null;
  nounsRepresented: ApiNounRepresented[];
  recentVotes: ApiRecentVote[];
  proposals: ProposalSummary[];
  candidates: CandidateSummary[];
  sponsored: SponsoredProposal[];
  nounsOwned: ApiNounOwned[];
  delegatingTo: string | null;
  delegators: string[];
}

interface VoterResult extends Voter {
  recentVotes: ApiRecentVote[];
  nounsOwned: NounWithSeed[];
  delegatingTo: string | null;
  delegators: string[];
  proposals: ProposalSummary[];
  candidates: CandidateSummary[];
  sponsored: SponsoredProposal[];
}

// ============================================================================
// FETCH FUNCTIONS
// ============================================================================

async function fetchVoters(
  first: number,
  skip: number,
  sort: VoterSort
): Promise<Voter[]> {
  const params = new URLSearchParams({
    limit: String(first),
    offset: String(skip),
    sort,
  });

  const response = await fetch(`/api/voters?${params}`);
  if (!response.ok) throw new Error('Failed to fetch voters');

  const json = await response.json();
  return (json.voters || []).map((v: ApiVoterListRow) => ({
    id: v.address,
    delegatedVotes: String(v.delegated_votes ?? '0'),
    tokenHoldersRepresentedAmount: Array.isArray(v.nouns_represented)
      ? v.nouns_represented.length
      : 0,
    nounsRepresented: Array.isArray(v.nouns_represented)
      ? v.nouns_represented.map((id: number) => ({ id: String(id) }))
      : [],
    votes: [],
  }));
}

async function fetchVoter(address: string): Promise<VoterResult> {
  const response = await fetch(`/api/voters/${address.toLowerCase()}`);
  if (!response.ok) throw new Error('Voter not found');

  const json = await response.json();
  const v: ApiVoterDetailResponse = json.voter;

  if (!v) throw new Error('Voter not found');

  return {
    id: v.id,
    delegatedVotes: v.delegatedVotes || '0',
    tokenHoldersRepresentedAmount: Array.isArray(v.nounsRepresented)
      ? v.nounsRepresented.length
      : 0,
    nounsRepresented: Array.isArray(v.nounsRepresented)
      ? v.nounsRepresented.map((n: ApiNounRepresented) => ({
          id: String(n.id),
          seed: n.seed,
        }))
      : [],
    votes: [],
    recentVotes: v.recentVotes || [],
    nounsOwned: (v.nounsOwned || []).map((n: ApiNounOwned) => ({
      id: String(n.id),
      seed: n.seed,
    })),
    delegatingTo: v.delegatingTo || null,
    delegators: v.delegators || [],
    proposals: v.proposals || [],
    candidates: v.candidates || [],
    sponsored: v.sponsored || [],
  };
}

// ============================================================================
// HOOKS
// ============================================================================

export function useVoters(first: number = 50, sort: VoterSort = 'power') {
  return useQuery({
    queryKey: ['camp', 'voters', first, sort],
    queryFn: () => fetchVoters(first, 0, sort),
    staleTime: 60000,
  });
}

/**
 * useInfiniteVoters
 *
 * Paginated voter list using offset-based pagination. Each page returns up to
 * `pageSize` voters; when a page returns fewer than `pageSize` rows we know we've
 * reached the end. Use this for infinite-scroll surfaces (Digest voters tab,
 * VoterListView) instead of `useVoters`, which fetches a single fixed-size page.
 *
 * Returns flattened `voters: Voter[]` for convenience plus the standard
 * react-query infinite-query helpers (`fetchNextPage`, `hasNextPage`,
 * `isFetchingNextPage`).
 */
export function useInfiniteVoters(
  sort: VoterSort = 'power',
  pageSize: number = VOTERS_PAGE_SIZE,
) {
  const query = useInfiniteQuery({
    queryKey: ['camp', 'voters-infinite', sort, pageSize],
    queryFn: ({ pageParam = 0 }) => fetchVoters(pageSize, pageParam as number, sort),
    initialPageParam: 0,
    getNextPageParam: (lastPage, allPages) => {
      // A short page = last page. Otherwise next offset is the running total.
      if (!lastPage || lastPage.length < pageSize) return undefined;
      return allPages.reduce((sum, page) => sum + page.length, 0);
    },
    staleTime: 60000,
  });

  const voters = query.data?.pages.flat() ?? [];

  return {
    voters,
    isLoading: query.isLoading,
    isFetchingNextPage: query.isFetchingNextPage,
    hasNextPage: !!query.hasNextPage,
    fetchNextPage: query.fetchNextPage,
    error: query.error,
  };
}

export function useVoter(address: string | null) {
  return useQuery({
    queryKey: ['camp', 'voter', address],
    queryFn: () => fetchVoter(address!),
    enabled: !!address,
    staleTime: 30000,
  });
}
