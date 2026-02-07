/**
 * Dynamic OG Image for Candidates
 * Generates rich preview images for candidate links
 *
 * Now queries Ponder's ponder_live schema instead of Goldsky
 */

import { ImageResponse } from 'next/og';
import { NextRequest } from 'next/server';
import { ponderSql } from '@/app/lib/ponder-db';

export const runtime = 'nodejs';

async function fetchCandidate(proposer: string, slug: string) {
  try {
    const candidateId = `${proposer.toLowerCase()}-${slug}`;
    const sql = ponderSql();

    // Fetch candidate
    const candidateRows = await sql`
      SELECT id, slug, proposer, title, description,
             created_timestamp, canceled
      FROM ponder_live.candidates
      WHERE id = ${candidateId}
    `;

    if (candidateRows.length === 0) {
      return { candidate: null, feedbacks: [] };
    }

    // Fetch feedback for this candidate
    const feedbackRows = await sql`
      SELECT support
      FROM ponder_live.candidate_feedback
      WHERE candidate_id = ${candidateId}
    `;

    return {
      candidate: candidateRows[0],
      feedbacks: feedbackRows,
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
    const res = await fetch(`https://api.ensideas.com/ens/resolve/${address.toLowerCase()}`);
    if (!res.ok) return formatAddress(address);
    const data = await res.json();
    return data.name || formatAddress(address);
  } catch {
    return formatAddress(address);
  }
}

function formatDate(timestamp: string | number): string {
  const ts = typeof timestamp === 'string' ? Number(timestamp) : timestamp;
  const date = new Date(ts * 1000);
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

  const title = candidate.title || candidate.slug.replace(/-/g, ' ');
  const description = candidate.description || '';
  const fundingRequest = extractFundingRequest(description);
  const isCanceled = candidate.canceled === true || candidate.canceled === 'true';

  // Resolve ENS name for proposer
  const proposerDisplay = await resolveENS(candidate.proposer);

  // Calculate feedback totals (count of feedback signals, not weighted votes)
  let forCount = 0;
  let againstCount = 0;
  let abstainCount = 0;
  for (const f of feedbacks) {
    const s = Number(f.support);
    if (s === 1) forCount++;
    else if (s === 0) againstCount++;
    else if (s === 2) abstainCount++;
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
          Created {formatDate(candidate.created_timestamp)} by {proposerDisplay}
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
              <span style={{ color: '#4ade80' }}>For {forCount}</span>
              {abstainCount > 0 && <span style={{ color: '#9ca3af' }}>Abstain {abstainCount}</span>}
              {againstCount > 0 && <span style={{ color: '#f87171' }}>Against {againstCount}</span>}
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
