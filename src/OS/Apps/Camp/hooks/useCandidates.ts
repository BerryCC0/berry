/**
 * useCandidates Hook
 * Fetches proposal candidates from Ponder API
 */

'use client';

import { useQuery } from '@tanstack/react-query';
import type { Candidate, CandidateSignature, CandidateFeedback } from '../types';

// ============================================================================
// API RESPONSE MAPPING
// ============================================================================

/**
 * Map a candidate list item from API (snake_case) to Candidate type
 */
function mapCandidateListItem(c: any): Candidate {
  return {
    id: c.id,
    proposer: c.proposer,
    slug: c.slug,
    title: c.title || undefined,
    description: c.description || '',
    createdTimestamp: String(c.created_timestamp ?? '0'),
    lastUpdatedTimestamp: String(c.last_updated_timestamp ?? '0'),
    canceled: c.canceled || false,
  };
}

/**
 * Map full candidate detail from API (with signatures, feedback) to Candidate type
 */
function mapCandidateDetail(c: any): Candidate {
  const now = Math.floor(Date.now() / 1000);

  // Build actions array from parallel arrays
  const actions = c.targets?.map((target: string, i: number) => ({
    target,
    value: c.values?.[i] || '0',
    signature: c.signatures_list?.[i] ?? '',
    calldata: c.calldatas?.[i] || '0x',
  })) || [];

  // Build signatures array (active, non-expired sponsors)
  const signatures: CandidateSignature[] = (c.signatures || [])
    .filter((sig: any) => {
      // Only include non-expired signatures
      const expiration = Number(sig.expiration_timestamp);
      return expiration > now;
    })
    .map((sig: any) => ({
      id: sig.id,
      signer: sig.signer,
      sig: sig.sig,
      expirationTimestamp: String(sig.expiration_timestamp),
      reason: sig.reason || '',
      canceled: false,
      createdTimestamp: String(sig.block_timestamp),
    }));

  // Build feedback array
  const feedback: CandidateFeedback[] = (c.feedback || []).map((f: any) => ({
    id: f.id,
    voter: f.msg_sender,
    support: f.support,
    votes: String(f.votes ?? '1'),
    reason: f.reason,
    createdTimestamp: String(f.block_timestamp),
  }));

  return {
    id: c.id,
    proposer: c.proposer,
    slug: c.slug,
    title: c.title || undefined,
    description: c.description || '',
    createdTimestamp: String(c.created_timestamp ?? '0'),
    lastUpdatedTimestamp: String(c.last_updated_timestamp ?? '0'),
    canceled: c.canceled || false,
    proposalIdToUpdate: c.proposal_id_to_update || undefined,
    actions,
    signatures,
    feedback,
  };
}

// ============================================================================
// FETCH FUNCTIONS
// ============================================================================

async function fetchCandidates(first: number, _skip: number): Promise<Candidate[]> {
  const params = new URLSearchParams({ limit: String(first) });

  const response = await fetch(`/api/candidates?${params}`);
  if (!response.ok) throw new Error('Failed to fetch candidates');

  const json = await response.json();
  return (json.candidates || []).map(mapCandidateListItem);
}

async function fetchCandidate(proposer: string, slug: string): Promise<Candidate> {
  const id = `${proposer.toLowerCase()}-${slug}`;

  const response = await fetch(`/api/candidates/${encodeURIComponent(id)}`);
  if (!response.ok) throw new Error('Candidate not found');

  const json = await response.json();
  if (!json.candidate) throw new Error('Candidate not found');

  return mapCandidateDetail(json.candidate);
}

/**
 * Fetch candidate by slug only (when proposer is not known from URL)
 */
async function fetchCandidateBySlug(slug: string): Promise<Candidate> {
  const params = new URLSearchParams({ slug });
  const response = await fetch(`/api/candidates?${params}`);
  if (!response.ok) throw new Error('Candidate not found');

  const json = await response.json();
  const candidate = json.candidate;
  if (!candidate) throw new Error('Candidate not found');

  return mapCandidateDetail(candidate);
}

// ============================================================================
// HOOKS
// ============================================================================

export function useCandidates(first: number = 20) {
  return useQuery({
    queryKey: ['camp', 'candidates', first],
    queryFn: () => fetchCandidates(first, 0),
    staleTime: 60000,
  });
}

/**
 * Fetch a candidate by proposer + slug (full ID) or just slug (clean URL)
 * When proposer is empty, looks up the candidate by slug
 */
export function useCandidate(proposer: string | null, slug: string | null) {
  return useQuery({
    queryKey: ['camp', 'candidate', proposer || 'by-slug', slug],
    queryFn: () => {
      if (!slug) throw new Error('Slug is required');
      if (!proposer) {
        return fetchCandidateBySlug(slug);
      }
      return fetchCandidate(proposer, slug);
    },
    enabled: !!slug,
    staleTime: 30000,
  });
}
