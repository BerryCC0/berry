/**
 * useActivityFeed Hook
 * Fetches unified activity feed from Goldsky
 */

'use client';

import { useQuery } from '@tanstack/react-query';
import { GOLDSKY_ENDPOINT } from '@/app/lib/nouns/constants';
import type { ActivityItem } from '../types';

const ACTIVITY_QUERY = `
  query ActivityFeed($first: Int!, $skip: Int!) {
    votes(
      first: $first
      skip: $skip
      orderBy: blockTimestamp
      orderDirection: desc
    ) {
      id
      voter {
        id
      }
      proposal {
        id
        title
      }
      supportDetailed
      votes
      reason
      blockTimestamp
    }
    
    proposalFeedbacks(
      first: $first
      skip: $skip
      orderBy: createdTimestamp
      orderDirection: desc
    ) {
      id
      voter {
        id
      }
      proposal {
        id
        title
      }
      supportDetailed
      reason
      createdTimestamp
    }
  }
`;

interface ActivityQueryResult {
  votes: Array<{
    id: string;
    voter: { id: string };
    proposal: { id: string; title: string };
    supportDetailed: number;
    votes: string;
    reason: string | null;
    blockTimestamp: string;
  }>;
  proposalFeedbacks: Array<{
    id: string;
    voter: { id: string };
    proposal: { id: string; title: string };
    supportDetailed: number;
    reason: string | null;
    createdTimestamp: string;
  }>;
}

async function fetchActivity(first: number, skip: number): Promise<ActivityItem[]> {
  const response = await fetch(GOLDSKY_ENDPOINT, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      query: ACTIVITY_QUERY,
      variables: { first, skip },
    }),
  });

  const json = await response.json();
  if (json.errors) throw new Error(json.errors[0].message);

  const data = json.data as ActivityQueryResult;
  const items: ActivityItem[] = [];

  // Convert votes to activity items
  for (const vote of data.votes) {
    items.push({
      id: `vote-${vote.id}`,
      type: 'vote',
      timestamp: vote.blockTimestamp,
      actor: vote.voter.id,
      proposalId: vote.proposal.id,
      proposalTitle: vote.proposal.title,
      support: vote.supportDetailed,
      votes: vote.votes,
      reason: vote.reason || undefined,
    });
  }

  // Convert feedbacks to activity items
  for (const feedback of data.proposalFeedbacks) {
    items.push({
      id: `feedback-${feedback.id}`,
      type: 'proposal_feedback',
      timestamp: feedback.createdTimestamp,
      actor: feedback.voter.id,
      proposalId: feedback.proposal.id,
      proposalTitle: feedback.proposal.title,
      support: feedback.supportDetailed,
      reason: feedback.reason || undefined,
    });
  }

  // Sort by timestamp descending
  items.sort((a, b) => Number(b.timestamp) - Number(a.timestamp));

  return items;
}

export function useActivityFeed(first: number = 50) {
  return useQuery({
    queryKey: ['camp', 'activity', first],
    queryFn: () => fetchActivity(first, 0),
    staleTime: 30000, // 30 seconds
  });
}

