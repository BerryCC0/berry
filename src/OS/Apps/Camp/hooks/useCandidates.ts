/**
 * useCandidates Hook
 * Fetches proposal candidates from Goldsky
 */

'use client';

import { useQuery } from '@tanstack/react-query';
import { GOLDSKY_ENDPOINT } from '@/app/lib/nouns/constants';
import type { Candidate } from '../types';

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

  const c = json.data.proposalCandidate;
  return {
    id: c.id,
    proposer: c.proposer,
    slug: c.slug,
    description: c.latestVersion?.content?.description || '',
    title: c.latestVersion?.content?.title,
    createdTimestamp: c.createdTimestamp,
    lastUpdatedTimestamp: c.lastUpdatedTimestamp,
    canceled: c.canceled,
  };
}

export function useCandidates(first: number = 20) {
  return useQuery({
    queryKey: ['camp', 'candidates', first],
    queryFn: () => fetchCandidates(first, 0),
    staleTime: 60000,
  });
}

export function useCandidate(proposer: string | null, slug: string | null) {
  return useQuery({
    queryKey: ['camp', 'candidate', proposer, slug],
    queryFn: () => fetchCandidate(proposer!, slug!),
    enabled: !!proposer && !!slug,
    staleTime: 30000,
  });
}

