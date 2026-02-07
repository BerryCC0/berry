/**
 * useVoters Hook
 * Fetches delegates/voters from Ponder API
 */

'use client';

import { useQuery } from '@tanstack/react-query';
import type { Voter, VoterSort, NounWithSeed } from '../types';

// ============================================================================
// TYPES
// ============================================================================

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

interface VoterResult extends Voter {
  recentVotes: any[];
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
  _skip: number,
  sort: VoterSort
): Promise<Voter[]> {
  const params = new URLSearchParams({
    limit: String(first),
    sort,
  });

  const response = await fetch(`/api/voters?${params}`);
  if (!response.ok) throw new Error('Failed to fetch voters');

  const json = await response.json();
  return (json.voters || []).map((v: any) => ({
    id: v.address,
    delegatedVotes: String(v.delegated_votes ?? '0'),
    tokenHoldersRepresentedAmount: Array.isArray(v.nouns_represented)
      ? v.nouns_represented.length
      : 0,
    nounsRepresented: Array.isArray(v.nouns_represented)
      ? v.nouns_represented.map((id: any) => ({ id: String(id) }))
      : [],
    votes: [],
  }));
}

async function fetchVoter(address: string): Promise<VoterResult> {
  const response = await fetch(`/api/voters/${address.toLowerCase()}`);
  if (!response.ok) throw new Error('Voter not found');

  const json = await response.json();
  const v = json.voter;

  if (!v) throw new Error('Voter not found');

  return {
    id: v.id,
    delegatedVotes: v.delegatedVotes || '0',
    tokenHoldersRepresentedAmount: Array.isArray(v.nounsRepresented)
      ? v.nounsRepresented.length
      : 0,
    nounsRepresented: Array.isArray(v.nounsRepresented)
      ? v.nounsRepresented.map((id: any) => ({ id: String(id) }))
      : [],
    votes: [],
    recentVotes: v.recentVotes || [],
    nounsOwned: (v.nounsOwned || []).map((n: any) => ({
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

export function useVoter(address: string | null) {
  return useQuery({
    queryKey: ['camp', 'voter', address],
    queryFn: () => fetchVoter(address!),
    enabled: !!address,
    staleTime: 30000,
  });
}
