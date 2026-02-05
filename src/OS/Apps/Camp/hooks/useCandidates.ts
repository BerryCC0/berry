/**
 * useCandidates Hook
 * Fetches proposal candidates from Goldsky
 */

'use client';

import { useQuery } from '@tanstack/react-query';
import { GOLDSKY_ENDPOINT } from '@/app/lib/nouns/constants';
import type { Candidate, CandidateSignature, CandidateFeedback } from '../types';

const CANDIDATES_QUERY = `
  query Candidates($first: Int!, $skip: Int!) {
    proposalCandidates(
      first: $first
      skip: $skip
      orderBy: createdTimestamp
      orderDirection: desc
      where: { canceled: false }
    ) {
      id
      slug
      proposer
      createdTimestamp
      lastUpdatedTimestamp
      canceled
      latestVersion {
        content {
          title
          description
        }
      }
    }
  }
`;

const CANDIDATE_QUERY = `
  query Candidate($id: ID!) {
    proposalCandidate(id: $id) {
      id
      slug
      proposer
      createdTimestamp
      lastUpdatedTimestamp
      canceled
      latestVersion {
        content {
          title
          description
          targets
          values
          signatures
          calldatas
          contentSignatures(where: { canceled: false }) {
            id
            signer {
              id
            }
            sig
            expirationTimestamp
            reason
            canceled
            createdTimestamp
          }
        }
      }
    }
    candidateFeedbacks(
      where: { candidate_: { id: $id } }
      orderBy: createdTimestamp
      orderDirection: desc
      first: 100
    ) {
      id
      voter {
        id
      }
      supportDetailed
      votes
      reason
      createdTimestamp
    }
  }
`;

// Query to find a candidate by slug only (when proposer is not known)
const CANDIDATE_BY_SLUG_QUERY = `
  query CandidateBySlug($slug: String!) {
    proposalCandidates(
      where: { slug: $slug }
      first: 1
    ) {
      id
      slug
      proposer
      createdTimestamp
      lastUpdatedTimestamp
      canceled
      latestVersion {
        content {
          title
          description
          targets
          values
          signatures
          calldatas
          contentSignatures(where: { canceled: false }) {
            id
            signer {
              id
            }
            sig
            expirationTimestamp
            reason
            canceled
            createdTimestamp
          }
        }
      }
    }
  }
`;

interface CandidatesQueryResult {
  proposalCandidates: Array<{
    id: string;
    slug: string;
    proposer: string;
    createdTimestamp: string;
    lastUpdatedTimestamp: string;
    canceled: boolean;
    latestVersion?: {
      content?: {
        title?: string;
        description?: string;
      };
    };
  }>;
}

async function fetchCandidates(first: number, skip: number): Promise<Candidate[]> {
  const response = await fetch(GOLDSKY_ENDPOINT, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      query: CANDIDATES_QUERY,
      variables: { first, skip },
    }),
  });

  const json = await response.json();
  if (json.errors) throw new Error(json.errors[0].message);

  const data = json.data as CandidatesQueryResult;
  return data.proposalCandidates.map(c => ({
    id: c.id,
    proposer: c.proposer,
    slug: c.slug,
    description: c.latestVersion?.content?.description || '',
    title: c.latestVersion?.content?.title,
    createdTimestamp: c.createdTimestamp,
    lastUpdatedTimestamp: c.lastUpdatedTimestamp,
    canceled: c.canceled,
  }));
}

interface SignatureResult {
  id: string;
  signer: { id: string };
  sig: string;
  expirationTimestamp: string;
  reason: string;
  canceled: boolean;
  createdTimestamp: string;
}

/**
 * Parse candidate data from subgraph response
 */
function parseCandidateData(c: any, feedbackData?: any[]): Candidate {
  const content = c.latestVersion?.content;
  
  // Build actions array from parallel arrays
  const actions = content?.targets?.map((target: string, i: number) => ({
    target,
    value: content?.values?.[i] || '0',
    signature: content?.signatures?.[i] || '',
    calldata: content?.calldatas?.[i] || '0x',
  })) || [];

  // Build signatures array (active, non-expired sponsors)
  const now = Math.floor(Date.now() / 1000);
  const signatures: CandidateSignature[] = (content?.contentSignatures || [])
    .filter((sig: SignatureResult) => !sig.canceled && Number(sig.expirationTimestamp) > now)
    .map((sig: SignatureResult) => ({
      id: sig.id,
      signer: sig.signer.id,
      sig: sig.sig,
      expirationTimestamp: sig.expirationTimestamp,
      reason: sig.reason,
      canceled: sig.canceled,
      createdTimestamp: sig.createdTimestamp,
    }));

  // Build feedback array
  const feedback: CandidateFeedback[] = (feedbackData || []).map((f: any) => ({
    id: f.id,
    voter: f.voter.id,
    support: f.supportDetailed,
    votes: f.votes,
    reason: f.reason,
    createdTimestamp: f.createdTimestamp,
  }));
  
  return {
    id: c.id,
    proposer: c.proposer,
    slug: c.slug,
    description: content?.description || '',
    title: content?.title,
    createdTimestamp: c.createdTimestamp,
    lastUpdatedTimestamp: c.lastUpdatedTimestamp,
    canceled: c.canceled,
    actions,
    signatures,
    feedback,
  };
}

async function fetchCandidate(proposer: string, slug: string): Promise<Candidate> {
  const id = `${proposer.toLowerCase()}-${slug}`;
  
  const response = await fetch(GOLDSKY_ENDPOINT, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      query: CANDIDATE_QUERY,
      variables: { id },
    }),
  });

  const json = await response.json();
  if (json.errors) throw new Error(json.errors[0].message);
  if (!json.data?.proposalCandidate) throw new Error('Candidate not found');

  return parseCandidateData(json.data.proposalCandidate, json.data.candidateFeedbacks);
}

/**
 * Fetch candidate by slug only (when proposer is not known from URL)
 */
async function fetchCandidateBySlug(slug: string): Promise<Candidate> {
  const response = await fetch(GOLDSKY_ENDPOINT, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      query: CANDIDATE_BY_SLUG_QUERY,
      variables: { slug },
    }),
  });

  const json = await response.json();
  if (json.errors) throw new Error(json.errors[0].message);
  
  const candidates = json.data?.proposalCandidates;
  if (!candidates || candidates.length === 0) throw new Error('Candidate not found');
  
  const c = candidates[0];
  
  // Fetch full data including feedback using the found proposer
  return fetchCandidate(c.proposer, slug);
}

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
      // If proposer is empty, look up by slug only
      if (!proposer) {
        return fetchCandidateBySlug(slug);
      }
      return fetchCandidate(proposer, slug);
    },
    enabled: !!slug,
    staleTime: 30000,
  });
}

