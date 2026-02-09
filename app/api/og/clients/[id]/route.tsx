/**
 * Dynamic OG Image for Individual Client Detail
 * Shows client name, URL, registration date, stats, and NFT image.
 * Matches the dark gradient style of the dashboard OG image.
 */

import { ImageResponse } from 'next/og';
import { NextRequest } from 'next/server';
import { ponderSql } from '@/app/lib/ponder-db';
import { CLIENT_NAMES, CLIENT_REGISTRY, getClientUrl } from '@/OS/lib/clientNames';

export const runtime = 'nodejs';

function weiToEth(wei: string): number {
  return Number(BigInt(wei || '0')) / 1e18;
}

function fmtEth(n: number): string {
  if (n >= 1) return n.toFixed(2);
  if (n >= 0.01) return n.toFixed(3);
  return n.toFixed(4);
}

function svgToDataUri(svg: string): string {
  const b64 = Buffer.from(svg, 'utf-8').toString('base64');
  return `data:image/svg+xml;base64,${b64}`;
}

// Cache the Courier font so it's only fetched once per cold start
let courierFontB64: string | null = null;
async function getCourierFontB64(): Promise<string> {
  if (courierFontB64) return courierFontB64;
  // Courier Prime is a Courier-compatible monospace font from Google Fonts
  const res = await fetch(
    'https://fonts.gstatic.com/s/courierprime/v9/u-450q2lgwslOqpF_6gQ8kELWwZjW-_-tvg.ttf',
  );
  const buf = await res.arrayBuffer();
  courierFontB64 = Buffer.from(buf).toString('base64');
  return courierFontB64;
}

/**
 * Extract raw SVG from a data URI, resize it, and embed a Courier font
 * so resvg can render the text elements in the NFT image.
 */
async function prepareNftSvg(dataUri: string, size: number): Promise<string> {
  let svg: string;

  if (dataUri.includes('base64,')) {
    const b64 = dataUri.split('base64,')[1];
    svg = Buffer.from(b64, 'base64').toString('utf-8');
  } else if (dataUri.startsWith('data:image/svg+xml,')) {
    svg = decodeURIComponent(dataUri.slice('data:image/svg+xml,'.length));
  } else {
    svg = dataUri;
  }

  // Embed Courier font so resvg can render text
  const fontB64 = await getCourierFontB64();
  const fontFaceStyle = `<defs><style>@font-face { font-family: 'Courier'; src: url('data:font/ttf;base64,${fontB64}') format('truetype'); }</style></defs>`;

  // Inject font + resize
  svg = svg.replace(
    /<svg([^>]*)>/i,
    (match, attrs) => {
      let cleaned = attrs
        .replace(/\s*width\s*=\s*["'][^"']*["']/gi, '')
        .replace(/\s*height\s*=\s*["'][^"']*["']/gi, '');
      return `<svg${cleaned} width="${size}" height="${size}">${fontFaceStyle}`;
    },
  );

  return svgToDataUri(svg);
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

    // Query the actual schema: client row + aggregated counts from separate tables
    const [clientRows, rankRows, voteCounts, proposalCounts, auctionCounts, bidCounts] = await Promise.all([
      sql`
        SELECT client_id, name, description, approved,
               total_rewarded::text as total_rewarded,
               total_withdrawn::text as total_withdrawn,
               nft_image,
               block_timestamp::text as block_timestamp
        FROM ponder_live.clients
        WHERE client_id = ${clientId}
      `,
      sql`
        SELECT client_id
        FROM ponder_live.clients
        WHERE approved = true
        ORDER BY total_rewarded DESC NULLS LAST
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

    // Calculate rank
    const rank = rankRows.findIndex((r: any) => r.client_id === clientId) + 1;
    const rankLabel = rank > 0 ? `#${rank}` : '';

    // Client URL
    const clientUrl = getClientUrl(clientId, c.description);

    // Registration date
    const registeredDate = formatDate(c.block_timestamp);

    // Stats to display
    const stats = [
      { label: 'REWARDED', value: `${fmtEth(rewarded)} ETH`, color: '#5B8DEF' },
      { label: 'BALANCE', value: `${fmtEth(balance)} ETH`, color: '#34c759' },
      { label: 'VOTES', value: voteCount.toLocaleString(), color: '#ff9500' },
      { label: 'PROPOSALS', value: String(proposalCount), color: '#af52de' },
      { label: 'BIDS', value: bidCount.toLocaleString(), color: '#5ac8fa' },
      { label: 'AUCTION WINS', value: String(auctionCount), color: '#ffcc00' },
    ];

    // Process NFT image — resize SVG and embed Courier font for text rendering
    const NFT_SIZE = 500;
    let nftImageSrc: string | null = null;
    if (c.nft_image) {
      const raw = c.nft_image as string;
      if (raw.startsWith('data:image/svg') || raw.startsWith('<svg') || raw.startsWith('<?xml')) {
        nftImageSrc = await prepareNftSvg(raw, NFT_SIZE);
      } else if (raw.startsWith('data:')) {
        // Non-SVG data URI (e.g. PNG) — use as-is
        nftImageSrc = raw;
      }
    }

    // Favicon: use Google's favicon service for reliability
    let faviconSrc: string | null = null;
    if (clientUrl) {
      try {
        const domain = new URL(clientUrl).hostname;
        faviconSrc = `https://www.google.com/s2/favicons?domain=${domain}&sz=64`;
      } catch {
        // invalid URL, skip
      }
    }

    return new ImageResponse(
      (
        <div
          style={{
            display: 'flex',
            width: '100%',
            height: '100%',
            background: 'linear-gradient(145deg, #1a1a2e 0%, #16213e 40%, #0f3460 100%)',
            fontFamily: 'system-ui',
            padding: 0,
          }}
        >
          {/* Left side: Info */}
          <div
            style={{
              display: 'flex',
              flexDirection: 'column',
              justifyContent: 'center',
              width: nftImageSrc ? 700 : '100%',
              padding: '48px 56px',
            }}
          >
            {/* Branding */}
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                marginBottom: 12,
              }}
            >
              <span
                style={{
                  fontSize: 20,
                  color: 'rgba(255,255,255,0.35)',
                  fontWeight: 600,
                }}
              >
                Client Incentives
              </span>
              <span
                style={{
                  fontSize: 20,
                  color: 'rgba(255,255,255,0.25)',
                  fontWeight: 600,
                }}
              >
                Berry OS
              </span>
            </div>

            {/* Client name + favicon + approved badge + rank */}
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 14,
                marginBottom: 6,
              }}
            >
              {faviconSrc && (
                <img
                  src={faviconSrc}
                  width={48}
                  height={48}
                  style={{ borderRadius: 8, flexShrink: 0 }}
                />
              )}
              <span
                style={{
                  fontSize: 60,
                  fontWeight: 800,
                  color: '#ffffff',
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
                    width: 18,
                    height: 18,
                    borderRadius: '50%',
                    background: '#34c759',
                    flexShrink: 0,
                    marginTop: 4,
                  }}
                />
              )}
              {rankLabel && (
                <span
                  style={{
                    fontSize: 32,
                    fontWeight: 700,
                    color: rank <= 3 ? '#ffd700' : 'rgba(255,255,255,0.4)',
                    marginLeft: 4,
                  }}
                >
                  {rankLabel}
                </span>
              )}
            </div>

            {/* URL + ID + Registration date */}
            <div
              style={{
                display: 'flex',
                flexDirection: 'column',
                gap: 4,
                marginBottom: 28,
              }}
            >
              {clientUrl && (
                <span
                  style={{
                    fontSize: 22,
                    color: '#5B8DEF',
                    fontWeight: 600,
                  }}
                >
                  {clientUrl.replace(/^https?:\/\//, '')}
                </span>
              )}
              <span
                style={{
                  fontSize: 20,
                  color: 'rgba(255,255,255,0.4)',
                  fontWeight: 500,
                }}
              >
                ID: {clientId}{registeredDate ? ` · Registered ${registeredDate}` : ''}
              </span>
            </div>

            {/* Stats grid */}
            <div
              style={{
                display: 'flex',
                flexWrap: 'wrap',
                gap: 10,
              }}
            >
              {stats.map((stat) => (
                <div
                  key={stat.label}
                  style={{
                    display: 'flex',
                    flexDirection: 'column',
                    background: 'rgba(255,255,255,0.06)',
                    borderRadius: 10,
                    padding: '12px 18px',
                    minWidth: 130,
                  }}
                >
                  <span
                    style={{
                      fontSize: 13,
                      fontWeight: 700,
                      color: 'rgba(255,255,255,0.4)',
                      letterSpacing: 0.5,
                      marginBottom: 3,
                    }}
                  >
                    {stat.label}
                  </span>
                  <span
                    style={{
                      fontSize: 26,
                      fontWeight: 700,
                      color: stat.color,
                    }}
                  >
                    {stat.value}
                  </span>
                </div>
              ))}
            </div>
          </div>

          {/* Right side: NFT image */}
          {nftImageSrc && (
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                flex: 1,
                padding: 24,
              }}
            >
              <img
                src={nftImageSrc}
                width={NFT_SIZE}
                height={NFT_SIZE}
                style={{
                  borderRadius: 24,
                  imageRendering: 'pixelated',
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

    // Fallback
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
            background: 'linear-gradient(145deg, #1a1a2e 0%, #16213e 40%, #0f3460 100%)',
          }}
        >
          <span style={{ fontSize: 72, fontWeight: 800, color: '#ffffff' }}>
            Client #{clientId}
          </span>
          <span style={{ fontSize: 28, color: 'rgba(255,255,255,0.5)', marginTop: 16 }}>
            Client Incentives — Berry OS
          </span>
        </div>
      ),
      { width: 1200, height: 630 },
    );
  }
}
