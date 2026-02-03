/**
 * Dynamic OG Image for Candidates
 * Generates rich preview images for candidate links
 */

import { ImageResponse } from 'next/og';
import { NextRequest } from 'next/server';
import { createPublicClient, http } from 'viem';
import { mainnet } from 'viem/chains';
import { GOLDSKY_ENDPOINT } from '@/app/lib/nouns/constants';

export const runtime = 'edge';

// Viem client for ENS resolution
const publicClient = createPublicClient({
  chain: mainnet,
  transport: http('https://eth.llamarpc.com'),
});

const CANDIDATE_QUERY = `
  query Candidate($id: ID!) {
    proposalCandidate(id: $id) {
      id
      slug
      proposer
      createdTimestamp
      canceled
      latestVersion {
        content {
          title
          description
        }
      }
    }
    candidateFeedbacks(
      where: { candidate_: { id: $id } }
      first: 100
    ) {
      supportDetailed
      votes
    }
  }
`;

interface CandidateData {
  id: string;
  slug: string;
  proposer: string;
  createdTimestamp: string;
  canceled: boolean;
  latestVersion?: {
    content?: {
      title?: string;
      description?: string;
    };
  };
}

interface FeedbackData {
  supportDetailed: number;
  votes: string;
}

async function fetchCandidate(proposer: string, slug: string): Promise<{ candidate: CandidateData | null; feedbacks: FeedbackData[] }> {
  try {
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
    return {
      candidate: json.data?.proposalCandidate || null,
      feedbacks: json.data?.candidateFeedbacks || [],
    };
  } catch {
    return { candidate: null, feedbacks: [] };
  }
}

function formatAddress(address: string): string {
  return `${address.slice(0, 6)}...${address.slice(-4)}`;
}

async function resolveENS(address: string): Promise<string> {
  try {
    const ensName = await publicClient.getEnsName({
      address: address as `0x${string}`,
    });
    return ensName || formatAddress(address);
  } catch {
    return formatAddress(address);
  }
}

function formatDate(timestamp: string): string {
  const date = new Date(Number(timestamp) * 1000);
  return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}

function extractFundingRequest(description: string): string | null {
  const patterns = [
    /requesting\s+([\d,\.]+)\s*(eth|usdc|weth|dai)/i,
    /request(?:s|ing)?\s+(?:of\s+)?([\d,\.]+)\s*(eth|usdc|weth|dai)/i,
    /([\d,\.]+)\s*(eth|usdc|weth|dai)\s+request/i,
  ];
  
  for (const pattern of patterns) {
    const match = description.match(pattern);
    if (match) {
      return `${match[1]} ${match[2].toUpperCase()}`;
    }
  }
  return null;
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ params: string[] }> }
) {
  const { params: routeParams } = await params;
  
  // Expect [proposer, ...slug]
  if (!routeParams || routeParams.length < 2) {
    return new ImageResponse(
      (
        <div
          style={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            width: '100%',
            height: '100%',
            backgroundColor: '#1a1a2e',
            color: '#fff',
            fontFamily: 'system-ui',
          }}
        >
          <div style={{ fontSize: 48 }}>Candidate Not Found</div>
        </div>
      ),
      { width: 1200, height: 630 }
    );
  }

  const proposer = routeParams[0];
  const slug = routeParams.slice(1).join('/');
  const { candidate, feedbacks } = await fetchCandidate(proposer, slug);

  if (!candidate) {
    return new ImageResponse(
      (
        <div
          style={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            width: '100%',
            height: '100%',
            backgroundColor: '#1a1a2e',
            color: '#fff',
            fontFamily: 'system-ui',
          }}
        >
          <div style={{ fontSize: 48 }}>Candidate Not Found</div>
        </div>
      ),
      { width: 1200, height: 630 }
    );
  }

  const title = candidate.latestVersion?.content?.title || candidate.slug.replace(/-/g, ' ');
  const description = candidate.latestVersion?.content?.description || '';
  const fundingRequest = extractFundingRequest(description);
  const isCanceled = candidate.canceled;
  
  // Resolve ENS name for proposer
  const proposerDisplay = await resolveENS(candidate.proposer);

  // Calculate feedback totals
  let forVotes = 0;
  let againstVotes = 0;
  let abstainVotes = 0;
  for (const f of feedbacks) {
    const votes = Number(f.votes);
    if (f.supportDetailed === 1) forVotes += votes;
    else if (f.supportDetailed === 0) againstVotes += votes;
    else if (f.supportDetailed === 2) abstainVotes += votes;
  }
  const totalFeedback = feedbacks.length;

  return new ImageResponse(
    (
      <div
        style={{
          display: 'flex',
          flexDirection: 'column',
          width: '100%',
          height: '100%',
          backgroundColor: '#16161d',
          color: '#fff',
          fontFamily: 'system-ui',
          padding: 48,
        }}
      >
        {/* Status Badge */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 16, marginBottom: 24 }}>
          <div
            style={{
              display: 'flex',
              backgroundColor: isCanceled ? '#6b7280' : '#8b5cf6',
              color: '#fff',
              padding: '8px 16px',
              borderRadius: 6,
              fontSize: 18,
              fontWeight: 700,
              textTransform: 'uppercase',
            }}
          >
            {isCanceled ? 'Canceled' : 'Candidate'}
          </div>
          {totalFeedback > 0 && (
            <div style={{ display: 'flex', fontSize: 20, color: '#9ca3af' }}>
              {totalFeedback} signal{totalFeedback !== 1 ? 's' : ''}
            </div>
          )}
        </div>

        {/* Title */}
        <div
          style={{
            display: 'flex',
            fontSize: 52,
            fontWeight: 700,
            lineHeight: 1.2,
            marginBottom: 20,
            maxHeight: 160,
            overflow: 'hidden',
          }}
        >
          {title.length > 80 ? title.slice(0, 80) + '...' : title}
        </div>

        {/* Proposer and Date */}
        <div style={{ display: 'flex', fontSize: 22, color: '#9ca3af', marginBottom: 32 }}>
          Created {formatDate(candidate.createdTimestamp)} by {proposerDisplay}
        </div>

        {/* Funding Request (if found) */}
        {fundingRequest && (
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              backgroundColor: '#1e293b',
              borderRadius: 8,
              padding: '12px 20px',
              marginBottom: 32,
              fontSize: 24,
            }}
          >
            <span style={{ color: '#94a3b8' }}>Requesting</span>
            <span style={{ fontWeight: 700, marginLeft: 12 }}>{fundingRequest}</span>
          </div>
        )}

        {/* Feedback Summary */}
        {totalFeedback > 0 && (
          <div style={{ display: 'flex', flexDirection: 'column', marginTop: 'auto' }}>
            <div style={{ display: 'flex', gap: 32, fontSize: 24 }}>
              <span style={{ color: '#4ade80' }}>For {forVotes}</span>
              {abstainVotes > 0 && <span style={{ color: '#9ca3af' }}>Abstain {abstainVotes}</span>}
              {againstVotes > 0 && <span style={{ color: '#f87171' }}>Against {againstVotes}</span>}
            </div>
          </div>
        )}

        {/* Berry OS Branding */}
        <div
          style={{
            display: 'flex',
            position: 'absolute',
            bottom: 24,
            right: 48,
            fontSize: 18,
            color: '#6b7280',
          }}
        >
          Berry OS
        </div>
      </div>
    ),
    {
      width: 1200,
      height: 630,
    }
  );
}
