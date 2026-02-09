/**
 * Dynamic OG Image for Individual Client Detail
 * Clean layout matching the client detail header style:
 * favicon + name + approved dot, URL, ID/date, then stats in bordered boxes.
 */

import { ImageResponse } from 'next/og';
import { NextRequest } from 'next/server';
import { ponderSql } from '@/app/lib/ponder-db';
import { CLIENT_NAMES, getClientUrl } from '@/OS/lib/clientNames';

export const runtime = 'nodejs';

function weiToEth(wei: string): number {
  return Number(BigInt(wei || '0')) / 1e18;
}

function fmtEth(n: number): string {
  if (n >= 1) return n.toFixed(2);
  if (n >= 0.01) return n.toFixed(3);
  return n.toFixed(4);
}

function formatDate(timestamp: string): string {
  const ts = Number(timestamp);
  if (!ts || isNaN(ts)) return '';
  const d = new Date(ts * 1000);
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id: idParam } = await params;
  const clientId = parseInt(idParam, 10);

  if (isNaN(clientId) || clientId < 0) {
    return new Response('Invalid client ID', { status: 400 });
  }

  try {
    const sql = ponderSql();

    const [clientRows, voteCounts, proposalCounts, auctionCounts, bidCounts] = await Promise.all([
      sql`
        SELECT client_id, name, description, approved,
               total_rewarded::text as total_rewarded,
               total_withdrawn::text as total_withdrawn,
               block_timestamp::text as block_timestamp
        FROM ponder_live.clients
        WHERE client_id = ${clientId}
      `,
      sql`
        SELECT COALESCE(SUM(votes), 0)::int as vote_count
        FROM ponder_live.client_votes
        WHERE client_id = ${clientId}
      `,
      sql`
        SELECT COUNT(*)::int as proposal_count
        FROM ponder_live.proposals
        WHERE client_id = ${clientId}
      `,
      sql`
        SELECT COUNT(*)::int as auction_count
        FROM ponder_live.auction_bids b
        INNER JOIN ponder_live.auctions a
          ON b.noun_id = a.noun_id AND b.bidder = a.winner AND b.amount = a.amount
        WHERE a.settled = true AND b.client_id = ${clientId}
      `,
      sql`
        SELECT COUNT(*)::int as bid_count
        FROM ponder_live.auction_bids
        WHERE client_id = ${clientId}
      `,
    ]);

    if (clientRows.length === 0) {
      return new Response('Client not found', { status: 404 });
    }

    const c = clientRows[0];
    const name = CLIENT_NAMES[clientId] ?? (c.name || `Client ${clientId}`);
    const rewarded = weiToEth(c.total_rewarded);
    const withdrawn = weiToEth(c.total_withdrawn);
    const balance = rewarded - withdrawn;
    const voteCount = voteCounts[0]?.vote_count ?? 0;
    const proposalCount = proposalCounts[0]?.proposal_count ?? 0;
    const auctionCount = auctionCounts[0]?.auction_count ?? 0;
    const bidCount = bidCounts[0]?.bid_count ?? 0;

    const clientUrl = getClientUrl(clientId, c.description);
    const registeredDate = formatDate(c.block_timestamp);

    // Favicon via Google's service (large size for right-side display)
    let faviconSrc: string | null = null;
    if (clientUrl) {
      try {
        const domain = new URL(clientUrl).hostname;
        faviconSrc = `https://t3.gstatic.com/faviconV2?client=SOCIAL&type=FAVICON&fallback_opts=TYPE,SIZE,URL&url=${encodeURIComponent(clientUrl)}&size=256`;
      } catch {
        // skip
      }
    }

    // Stat box style shared across all boxes
    const statBox = {
      display: 'flex' as const,
      flexDirection: 'column' as const,
      alignItems: 'center' as const,
      justifyContent: 'center' as const,
      border: '2px solid #e0e0e0',
      borderRadius: 8,
      padding: '16px 24px',
      minWidth: 120,
    };

    const statLabel = {
      fontSize: 14,
      fontWeight: 700,
      color: '#888',
      letterSpacing: 1,
      textTransform: 'uppercase' as const,
      marginBottom: 4,
    };

    const statValue = {
      fontSize: 32,
      fontWeight: 800,
      color: '#1a1a1a',
    };

    return new ImageResponse(
      (
        <div
          style={{
            display: 'flex',
            width: '100%',
            height: '100%',
            background: '#f5f5f5',
            fontFamily: 'system-ui',
            padding: '56px 64px',
            alignItems: 'center',
          }}
        >
          {/* Left side: name, URL, stats */}
          <div
            style={{
              display: 'flex',
              flexDirection: 'column',
              flex: 1,
              justifyContent: 'center',
            }}
          >
            {/* Name + Approved dot */}
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 14,
                marginBottom: 8,
              }}
            >
              <span
                style={{
                  fontSize: 64,
                  fontWeight: 800,
                  color: '#1a1a1a',
                  letterSpacing: '-1px',
                  lineHeight: 1.1,
                }}
              >
                {name}
              </span>
              {c.approved && (
                <div
                  style={{
                    display: 'flex',
                    width: 20,
                    height: 20,
                    borderRadius: '50%',
                    background: '#34c759',
                    flexShrink: 0,
                  }}
                />
              )}
            </div>

            {/* URL */}
            {clientUrl && (
              <span
                style={{
                  fontSize: 24,
                  color: '#555',
                  fontWeight: 500,
                  marginBottom: 4,
                }}
              >
                {clientUrl.replace(/^https?:\/\//, '')}
              </span>
            )}

            {/* ID + Registration date */}
            <span
              style={{
                fontSize: 22,
                color: '#999',
                fontWeight: 500,
                marginBottom: 40,
              }}
            >
              ID: {clientId}{registeredDate ? ` · Registered ${registeredDate}` : ''}
            </span>

            {/* Stats top row: Rewarded + Balance */}
            <div
              style={{
                display: 'flex',
                gap: 12,
                marginBottom: 12,
              }}
            >
              <div style={{ ...statBox, padding: '16px 32px', minWidth: 180 }}>
                <span style={statLabel}>Rewarded</span>
                <span style={statValue}>{fmtEth(rewarded)} ETH</span>
              </div>
              <div style={{ ...statBox, padding: '16px 32px', minWidth: 180 }}>
                <span style={statLabel}>Balance</span>
                <span style={statValue}>{fmtEth(balance)} ETH</span>
              </div>
            </div>

            {/* Stats bottom row: Wins, Bids, Votes, Props */}
            <div
              style={{
                display: 'flex',
                gap: 12,
              }}
            >
              <div style={statBox}>
                <span style={statLabel}>Wins</span>
                <span style={statValue}>{auctionCount}</span>
              </div>
              <div style={statBox}>
                <span style={statLabel}>Bids</span>
                <span style={statValue}>{bidCount.toLocaleString()}</span>
              </div>
              <div style={statBox}>
                <span style={statLabel}>Votes</span>
                <span style={statValue}>{voteCount.toLocaleString()}</span>
              </div>
              <div style={statBox}>
                <span style={statLabel}>Props</span>
                <span style={statValue}>{proposalCount}</span>
              </div>
            </div>

            {/* Berry OS branding */}
            <div
              style={{
                display: 'flex',
                justifyContent: 'flex-end',
                marginTop: 32,
              }}
            >
              <span
                style={{
                  fontSize: 18,
                  color: '#bbb',
                  fontWeight: 600,
                }}
              >
                Client Incentives — Berry OS
              </span>
            </div>
          </div>

          {/* Right side: Large favicon */}
          {faviconSrc && (
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                marginLeft: 48,
              }}
            >
              <img
                src={faviconSrc}
                width={280}
                height={280}
                style={{
                  borderRadius: 32,
                  objectFit: 'contain',
                }}
              />
            </div>
          )}
        </div>
      ),
      {
        width: 1200,
        height: 630,
      },
    );
  } catch (error) {
    console.error(`[OG] Failed to generate Client ${clientId} image:`, error);

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
            background: '#f5f5f5',
          }}
        >
          <span style={{ fontSize: 72, fontWeight: 800, color: '#1a1a1a' }}>
            Client #{clientId}
          </span>
          <span style={{ fontSize: 28, color: '#999', marginTop: 16 }}>
            Client Incentives — Berry OS
          </span>
        </div>
      ),
      { width: 1200, height: 630 },
    );
  }
}
