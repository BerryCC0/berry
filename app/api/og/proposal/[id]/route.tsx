/**
 * Dynamic OG Image for Proposals
 * Generates rich preview images for proposal links
 *
 * Now queries Ponder's ponder_live schema instead of Goldsky
 */

import { ImageResponse } from 'next/og';
import { NextRequest } from 'next/server';
import { ponderSql } from '@/app/lib/ponder-db';

export const runtime = 'nodejs';

// Proposal status colors
const STATUS_COLORS: Record<string, { bg: string; text: string }> = {
  ACTIVE: { bg: '#4ade80', text: '#000' },
  PENDING: { bg: '#fbbf24', text: '#000' },
  SUCCEEDED: { bg: '#22c55e', text: '#fff' },
  QUEUED: { bg: '#3b82f6', text: '#fff' },
  EXECUTED: { bg: '#10b981', text: '#fff' },
  DEFEATED: { bg: '#ef4444', text: '#fff' },
  CANCELLED: { bg: '#6b7280', text: '#fff' },
  VETOED: { bg: '#dc2626', text: '#fff' },
  EXPIRED: { bg: '#9ca3af', text: '#fff' },
  OBJECTION_PERIOD: { bg: '#f97316', text: '#fff' },
  UPDATABLE: { bg: '#8b5cf6', text: '#fff' },
};

async function fetchProposal(id: string) {
  try {
    const sql = ponderSql();
    const rows = await sql`
      SELECT id, title, description, status, proposer,
             created_timestamp, start_block, end_block,
             for_votes, against_votes, abstain_votes, quorum_votes
      FROM ponder_live.proposals
      WHERE id = ${parseInt(id)}
    `;
    return rows[0] || null;
  } catch {
    return null;
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

async function getCurrentBlock(): Promise<number> {
  try {
    const response = await fetch('https://eth.llamarpc.com', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        jsonrpc: '2.0',
        method: 'eth_blockNumber',
        params: [],
        id: 1,
      }),
    });
    const json = await response.json();
    return parseInt(json.result, 16);
  } catch {
    return Math.floor((Date.now() / 1000 - 1438269988) / 12);
  }
}

function formatTimeRemaining(blocksRemaining: number): string {
  if (blocksRemaining <= 0) return 'Ended';

  const secondsRemaining = blocksRemaining * 12;
  const hours = Math.floor(secondsRemaining / 3600);

  if (hours >= 24) {
    const days = Math.floor(hours / 24);
    return `${days} day${days > 1 ? 's' : ''} left`;
  }
  if (hours > 0) {
    return `${hours} hour${hours > 1 ? 's' : ''} left`;
  }
  const minutes = Math.floor(secondsRemaining / 60);
  return `${minutes} min${minutes > 1 ? 's' : ''} left`;
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
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const proposal = await fetchProposal(id);

  if (!proposal) {
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
          <div style={{ fontSize: 48 }}>Proposal Not Found</div>
        </div>
      ),
      { width: 1200, height: 630 }
    );
  }

  const status = proposal.status || 'PENDING';
  const statusColors = STATUS_COLORS[status] || STATUS_COLORS.PENDING;
  const forVotes = Number(proposal.for_votes);
  const againstVotes = Number(proposal.against_votes);
  const abstainVotes = Number(proposal.abstain_votes);
  const quorumVotes = Number(proposal.quorum_votes);
  const fundingRequest = extractFundingRequest(proposal.description || '');

  // Calculate time remaining for active proposals
  let timeRemaining: string | null = null;
  if (status === 'ACTIVE' || status === 'OBJECTION_PERIOD') {
    const currentBlock = await getCurrentBlock();
    const endBlockNum = Number(proposal.end_block);
    const blocksRemaining = endBlockNum - currentBlock;
    timeRemaining = formatTimeRemaining(blocksRemaining);
  }

  // Resolve ENS name for proposer
  const proposerDisplay = await resolveENS(proposal.proposer);

  // Calculate vote bar widths
  const maxVotes = Math.max(forVotes, againstVotes + abstainVotes, quorumVotes) || 1;
  const forWidth = (forVotes / maxVotes) * 100;
  const againstWidth = (againstVotes / maxVotes) * 100;

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
        {/* Status and Time */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 16, marginBottom: 24 }}>
          <div
            style={{
              display: 'flex',
              backgroundColor: statusColors.bg,
              color: statusColors.text,
              padding: '8px 16px',
              borderRadius: 6,
              fontSize: 18,
              fontWeight: 700,
              textTransform: 'uppercase',
            }}
          >
            {status.replace('_', ' ')}
          </div>
          {timeRemaining && timeRemaining !== 'Ended' && (
            <div style={{ display: 'flex', fontSize: 20, color: '#9ca3af' }}>
              Voting ends in {timeRemaining.replace(' left', '')}
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
          {(proposal.title || '').length > 80 ? proposal.title.slice(0, 80) + '...' : proposal.title}
        </div>

        {/* Proposer and Date */}
        <div style={{ display: 'flex', fontSize: 22, color: '#9ca3af', marginBottom: 32 }}>
          Proposed {formatDate(proposal.created_timestamp)} by {proposerDisplay}
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

        {/* Vote Bar */}
        <div style={{ display: 'flex', flexDirection: 'column', marginTop: 'auto' }}>
          {/* Vote counts */}
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 12 }}>
            <div style={{ display: 'flex', fontSize: 24 }}>
              <span style={{ color: '#4ade80', fontWeight: 700 }}>For {forVotes}</span>
              <span style={{ color: '#6b7280', margin: '0 8px' }}>·</span>
              <span style={{ color: '#9ca3af' }}>Quorum {quorumVotes}</span>
            </div>
            <div style={{ display: 'flex', gap: 16, fontSize: 24 }}>
              {abstainVotes > 0 && (
                <span style={{ color: '#9ca3af' }}>Abstain {abstainVotes}</span>
              )}
              {againstVotes > 0 && (
                <span style={{ color: '#f87171' }}>Against {againstVotes}</span>
              )}
            </div>
          </div>

          {/* Bar */}
          <div
            style={{
              display: 'flex',
              height: 24,
              borderRadius: 12,
              backgroundColor: '#374151',
              overflow: 'hidden',
            }}
          >
            {forVotes > 0 && (
              <div
                style={{
                  width: `${forWidth}%`,
                  height: '100%',
                  backgroundColor: '#4ade80',
                }}
              />
            )}
            {againstVotes > 0 && (
              <div
                style={{
                  width: `${againstWidth}%`,
                  height: '100%',
                  backgroundColor: '#f87171',
                  marginLeft: 'auto',
                }}
              />
            )}
          </div>
        </div>

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
