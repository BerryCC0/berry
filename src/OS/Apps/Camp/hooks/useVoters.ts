/**
 * useVoters Hook
 * Fetches delegates/voters from Goldsky
 */

'use client';

import { useQuery } from '@tanstack/react-query';
import { GOLDSKY_ENDPOINT } from '@/app/lib/nouns/constants';
import type { Voter, VoterSort, NounWithSeed } from '../types';

const VOTERS_QUERY = `
  query Voters($first: Int!, $skip: Int!, $orderBy: String!, $orderDirection: String!) {
    delegates(
      first: $first
      skip: $skip
      orderBy: $orderBy
      orderDirection: $orderDirection
      where: { delegatedVotesRaw_gt: "0" }
    ) {
      id
      delegatedVotes
      tokenHoldersRepresentedAmount
      nounsRepresented {
        id
      }
    }
  }
`;

const VOTER_QUERY = `
  query Voter($id: ID!) {
    delegate(id: $id) {
      id
      delegatedVotes
      tokenHoldersRepresentedAmount
      nounsRepresented {
        id
        seed {
          background
          body
          accessory
          head
          glasses
        }
      }
      tokenHoldersRepresented(first: 20) {
        id
      }
      votes(orderBy: blockTimestamp, orderDirection: desc, first: 500) {
        id
        proposal {
          id
          title
        }
        supportDetailed
        votes
        reason
        blockTimestamp
      }
    }
    account(id: $id) {
      id
      tokenBalance
      nouns {
        id
        seed {
          background
          body
          accessory
          head
          glasses
        }
      }
      delegate {
        id
      }
    }
    proposals(where: { proposer: $id }, orderBy: createdTimestamp, orderDirection: desc, first: 50) {
      id
      title
      status
      forVotes
      againstVotes
      abstainVotes
      quorumVotes
      createdTimestamp
      signers {
        id
      }
    }
    proposalCandidates(where: { proposer: $id, canceled: false }, orderBy: createdTimestamp, orderDirection: desc, first: 50) {
      id
      slug
      proposer
      createdTimestamp
      latestVersion {
        content {
          title
        }
      }
    }
  }
`;

const SPONSORED_QUERY = `
  query Sponsored($signer: String!) {
    proposalCandidateSignatures(
      where: { signer: $signer, canceled: false }
      orderBy: createdTimestamp
      orderDirection: desc
      first: 50
    ) {
      id
      createdTimestamp
      reason
      content {
        proposalCandidate {
          id
          slug
          proposer
          latestVersion {
            content {
              title
            }
          }
        }
      }
    }
  }
`;

interface VotersQueryResult {
  delegates: Array<{
    id: string;
    delegatedVotes: string;
    tokenHoldersRepresentedAmount: number;
    nounsRepresented: { id: string }[];
  }>;
}

async function fetchVoters(
  first: number,
  skip: number,
  sort: VoterSort
): Promise<Voter[]> {
  const orderByMap: Record<VoterSort, string> = {
    votes: 'totalVotes',
    power: 'delegatedVotesRaw',
    represented: 'tokenHoldersRepresentedAmount',
  };

  const response = await fetch(GOLDSKY_ENDPOINT, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      query: VOTERS_QUERY,
      variables: {
        first,
        skip,
        orderBy: orderByMap[sort],
        orderDirection: 'desc',
      },
    }),
  });

  const json = await response.json();
  if (json.errors) throw new Error(json.errors[0].message);

  const data = json.data as VotersQueryResult;
  return data.delegates.map(d => ({
    ...d,
    votes: [],
  }));
}

interface ProposalSummary {
  id: string;
  title: string;
  status: string;
  forVotes: string;
  againstVotes: string;
  abstainVotes: string;
  quorumVotes: string;
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

interface SponsoredCandidate {
  id: string;
  slug: string;
  proposer: string;
  title: string;
  signedAt: string;
  reason: string;
}

interface VoterResult extends Voter {
  recentVotes: any[];
  nounsOwned: NounWithSeed[];
  delegatingTo: string | null;
  delegators: string[];
  proposals: ProposalSummary[];
  candidates: CandidateSummary[];
  sponsored: SponsoredCandidate[];
}

async function fetchSponsored(address: string): Promise<SponsoredCandidate[]> {
  const response = await fetch(GOLDSKY_ENDPOINT, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      query: SPONSORED_QUERY,
      variables: { signer: address.toLowerCase() },
    }),
  });

  const json = await response.json();
  if (json.errors) return [];
  
  const signatures = json.data?.proposalCandidateSignatures || [];
  return signatures.map((sig: any) => {
    const candidate = sig.content?.proposalCandidate;
    return {
      id: candidate?.id || sig.id,
      slug: candidate?.slug || '',
      proposer: candidate?.proposer || '',
      title: candidate?.latestVersion?.content?.title || 'Untitled',
      signedAt: sig.createdTimestamp,
      reason: sig.reason || '',
    };
  }).filter((s: SponsoredCandidate) => s.slug); // Filter out invalid entries
}

async function fetchVoter(address: string): Promise<VoterResult> {
  // Fetch main voter data and sponsored candidates in parallel
  const [voterResponse, sponsored] = await Promise.all([
    fetch(GOLDSKY_ENDPOINT, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        query: VOTER_QUERY,
        variables: { id: address.toLowerCase() },
      }),
    }),
    fetchSponsored(address),
  ]);

  const json = await voterResponse.json();
  if (json.errors) throw new Error(json.errors[0].message);
  
  // Handle case where delegate doesn't exist (user has never voted/delegated)
  const d = json.data?.delegate;
  const account = json.data?.account;
  const proposalsData = json.data?.proposals || [];
  const candidatesData = json.data?.proposalCandidates || [];
  
  // If neither delegate nor account exists, throw error
  if (!d && !account) throw new Error('Voter not found');
  
  // Get owned Nouns from account entity (with seeds for images)
  const nounsOwned: NounWithSeed[] = account?.nouns || [];
  
  // Get who this account is delegating to
  const delegatingTo = account?.delegate?.id || null;
  
  // Get who is delegating to this account
  const delegators: string[] = (d?.tokenHoldersRepresented || []).map((h: { id: string }) => h.id);
  
  // Map proposals
  const proposals: ProposalSummary[] = proposalsData.map((p: any) => ({
    id: p.id,
    title: p.title || 'Untitled Proposal',
    status: p.status,
    forVotes: p.forVotes,
    againstVotes: p.againstVotes,
    abstainVotes: p.abstainVotes,
    quorumVotes: p.quorumVotes,
    createdTimestamp: p.createdTimestamp,
    signers: (p.signers || []).map((s: { id: string }) => s.id),
  }));
  
  // Map candidates
  const candidates: CandidateSummary[] = candidatesData.map((c: any) => ({
    id: c.id,
    slug: c.slug,
    proposer: c.proposer,
    title: c.latestVersion?.content?.title || 'Untitled Candidate',
    createdTimestamp: c.createdTimestamp,
  }));
  
  return {
    id: d?.id || address.toLowerCase(),
    delegatedVotes: d?.delegatedVotes || '0',
    tokenHoldersRepresentedAmount: d?.tokenHoldersRepresentedAmount || 0,
    nounsRepresented: d?.nounsRepresented || [],
    votes: [],
    recentVotes: (d?.votes || []).map((v: any) => ({
      id: v.id,
      voter: d?.id || address.toLowerCase(),
      proposalId: v.proposal.id,
      proposalTitle: v.proposal.title,
      support: v.supportDetailed,
      votes: v.votes,
      reason: v.reason,
      blockTimestamp: v.blockTimestamp,
    })),
    nounsOwned,
    delegatingTo,
    delegators,
    proposals,
    candidates,
    sponsored,
  };
}

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

