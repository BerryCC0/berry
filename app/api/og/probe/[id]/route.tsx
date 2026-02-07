/**
 * Dynamic OG Image for Probe Noun Detail
 * Layout: berryos.wtf top-left, Noun title, trait list + auction info on left, noun image on right
 *
 * Note: OG images are static PNGs cached by social platforms, so countdowns
 * are shown as absolute timestamps rather than live timers.
 */

import { ImageResponse } from 'next/og';
import { NextRequest } from 'next/server';
import { ponderSql } from '@/app/lib/ponder-db';
import { getTraitName } from '@/app/lib/nouns/utils/trait-name-utils';

// Use Node.js runtime — edge has issues with large SVG payloads + ImageData import
export const runtime = 'nodejs';

// Background colors (matches ImageData.bgcolors)
const BG_COLORS: Record<number, { hex: string }> = {
  0: { hex: 'd5d7e1' },
  1: { hex: 'e1d7d5' },
};

const ZERO_ADDRESS = '0x0000000000000000000000000000000000000000';

// Cache the font fetch so it's only done once per cold start
let fontData: ArrayBuffer | null = null;
async function getComicNeueFont(): Promise<ArrayBuffer> {
  if (fontData) return fontData;
  const res = await fetch(
    'https://fonts.gstatic.com/s/comicneue/v9/4UaErEJDsxBrF37olUeD_xHMwps.ttf'
  );
  fontData = await res.arrayBuffer();
  return fontData;
}

function svgToDataUri(svg: string): string {
  const b64 = Buffer.from(svg, 'utf-8').toString('base64');
  return `data:image/svg+xml;base64,${b64}`;
}

function truncateAddress(addr: string): string {
  return `${addr.slice(0, 6)}…${addr.slice(-4)}`;
}

function formatEth(wei: string): string {
  const eth = Number(BigInt(wei)) / 1e18;
  return `Ξ ${eth.toFixed(2)}`;
}

function formatDate(dateStr: string): string {
  const d = new Date(dateStr);
  if (isNaN(d.getTime()) || d.getTime() < 86400000) return '';
  return d.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
}

function formatTimestamp(unixSeconds: number): string {
  const d = new Date(unixSeconds * 1000);
  return d.toLocaleString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
    hour12: true,
  });
}

/** Resolve ENS name for an address (best-effort) */
async function resolveENS(address: string): Promise<string | null> {
  try {
    const res = await fetch(
      `https://api.ensideas.com/ens/resolve/${encodeURIComponent(address)}`
    );
    if (!res.ok) return null;
    const data = await res.json();
    return data.name || null;
  } catch {
    return null;
  }
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id: idParam } = await params;
  const nounId = parseInt(idParam);

  if (isNaN(nounId) || nounId < 0) {
    return new Response('Invalid noun ID', { status: 400 });
  }

  try {
    const sql = ponderSql();

    // Fetch everything in parallel
    const [fontResult, dbResult, auctionResult, bidsResult] = await Promise.all([
      getComicNeueFont(),
      sql`
        SELECT id, svg, background, body, accessory, head, glasses,
               settled_by_address, settled_by_ens, settled_at,
               winning_bid, winner_address, winner_ens
        FROM ponder_live.nouns WHERE id = ${nounId}
      `,
      sql`
        SELECT noun_id, start_time, end_time, winner, amount, settled
        FROM ponder_live.auctions WHERE noun_id = ${nounId}
      `,
      sql`
        SELECT bidder, amount
        FROM ponder_live.auction_bids
        WHERE noun_id = ${nounId}
        ORDER BY amount DESC
        LIMIT 1
      `,
    ]);

    const font = fontResult;

    if (dbResult.length === 0) {
      return new Response('Noun not found', { status: 404 });
    }

    const noun = dbResult[0];
    const auction = auctionResult[0] || null;
    const bg = BG_COLORS[noun.background] || BG_COLORS[0];
    const bgColor = `#${bg.hex}`;

    // Resolve trait names
    const traits = [
      { label: 'HEAD', value: getTraitName('head', noun.head) },
      { label: 'GLASSES', value: getTraitName('glasses', noun.glasses) },
      { label: 'ACCESSORY', value: getTraitName('accessory', noun.accessory) },
      { label: 'BODY', value: getTraitName('body', noun.body) },
      { label: 'BACKGROUND', value: getTraitName('background', noun.background) },
    ];

    // --- Build auction / settlement info lines ---
    const infoLines: { label: string; value: string }[] = [];

    const isSettled = auction?.settled === true;
    const isActive = auction && !auction.settled;

    if (isSettled) {
      // Settled noun: show settler + winning bid
      const settlerAddr = noun.settled_by_address;
      const settlerValid = settlerAddr && settlerAddr !== ZERO_ADDRESS;
      if (settlerValid) {
        const settlerName = noun.settled_by_ens || truncateAddress(settlerAddr);
        const settledDate = noun.settled_at ? formatDate(noun.settled_at) : '';
        infoLines.push({
          label: 'SETTLED BY',
          value: settledDate ? `${settlerName} on ${settledDate}` : settlerName,
        });
      }

      // Winning bid
      const bid = noun.winning_bid
        ? formatEth(noun.winning_bid)
        : auction.amount && auction.amount !== '0'
          ? formatEth(auction.amount)
          : null;

      if (bid) {
        const topBid = bidsResult[0];
        const winnerName = noun.winner_ens
          || (noun.winner_address && noun.winner_address !== ZERO_ADDRESS
            ? truncateAddress(noun.winner_address)
            : topBid?.bidder
              ? truncateAddress(topBid.bidder)
              : null);
        infoLines.push({
          label: 'WINNING BID',
          value: winnerName ? `${bid} by ${winnerName}` : bid,
        });
      }
    } else if (isActive) {
      // Active auction: show current bid + end time
      const topBid = bidsResult[0];
      if (topBid && topBid.amount !== '0') {
        let bidderName = truncateAddress(topBid.bidder);
        // Quick ENS resolve for the top bidder
        const ens = await resolveENS(topBid.bidder);
        if (ens) bidderName = ens;
        infoLines.push({
          label: 'CURRENT BID',
          value: `${formatEth(topBid.amount)} by ${bidderName}`,
        });
      }

      if (auction.end_time) {
        const endTs = parseInt(auction.end_time);
        const now = Math.floor(Date.now() / 1000);
        if (endTs > now) {
          infoLines.push({
            label: 'AUCTION ENDS',
            value: formatTimestamp(endTs),
          });
        } else {
          infoLines.push({ label: 'AUCTION', value: 'Ended — awaiting settlement' });
        }
      }
    }

    return new ImageResponse(
      (
        <div
          style={{
            display: 'flex',
            width: '100%',
            height: '100%',
            background: bgColor,
            fontFamily: '"Comic Neue"',
            padding: 0,
          }}
        >
          {/* Left side: Info */}
          <div
            style={{
              display: 'flex',
              flexDirection: 'column',
              justifyContent: 'center',
              width: 580,
              padding: '40px 0 40px 52px',
            }}
          >
            {/* berryos.wtf branding */}
            <div
              style={{
                display: 'flex',
                fontSize: 26,
                color: '#555',
                fontWeight: 700,
                marginBottom: 10,
              }}
            >
              berryos.wtf
            </div>

            {/* Noun ID */}
            <div
              style={{
                display: 'flex',
                fontSize: 84,
                fontWeight: 700,
                color: '#111',
                lineHeight: 1,
              }}
            >
              Noun {noun.id}
            </div>

            {/* Divider line */}
            <div
              style={{
                display: 'flex',
                width: 420,
                height: 4,
                background: 'rgba(0,0,0,0.18)',
                marginTop: 16,
                marginBottom: 18,
                borderRadius: 2,
              }}
            />

            {/* Trait list */}
            <div
              style={{
                display: 'flex',
                flexDirection: 'column',
                gap: 5,
              }}
            >
              {traits.map((trait) => (
                <div
                  key={trait.label}
                  style={{
                    display: 'flex',
                    alignItems: 'baseline',
                    gap: 14,
                  }}
                >
                  <span
                    style={{
                      fontSize: 20,
                      color: '#666',
                      fontWeight: 700,
                      letterSpacing: 0.5,
                      width: 160,
                      flexShrink: 0,
                    }}
                  >
                    {trait.label}
                  </span>
                  <span
                    style={{
                      fontSize: 28,
                      color: '#111',
                      fontWeight: 700,
                    }}
                  >
                    {trait.value}
                  </span>
                </div>
              ))}
            </div>

            {/* Auction / settlement info */}
            {infoLines.length > 0 && (
              <div
                style={{
                  display: 'flex',
                  flexDirection: 'column',
                  gap: 5,
                  marginTop: 16,
                  paddingTop: 14,
                  borderTop: '3px solid rgba(0,0,0,0.12)',
                }}
              >
                {infoLines.map((line) => (
                  <div
                    key={line.label}
                    style={{
                      display: 'flex',
                      alignItems: 'baseline',
                      gap: 14,
                    }}
                  >
                    <span
                      style={{
                        fontSize: 19,
                        color: '#666',
                        fontWeight: 700,
                        letterSpacing: 0.5,
                        width: 160,
                        flexShrink: 0,
                      }}
                    >
                      {line.label}
                    </span>
                    <span
                      style={{
                        fontSize: 24,
                        color: '#111',
                        fontWeight: 700,
                      }}
                    >
                      {line.value}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Right side: Noun image */}
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              flex: 1,
              padding: 16,
            }}
          >
            <img
              src={svgToDataUri(noun.svg)}
              width={580}
              height={580}
              style={{
                borderRadius: 16,
                imageRendering: 'pixelated',
              }}
            />
          </div>
        </div>
      ),
      {
        width: 1200,
        height: 630,
        fonts: [
          {
            name: 'Comic Neue',
            data: font,
            weight: 700,
            style: 'normal',
          },
        ],
      }
    );
  } catch (error) {
    console.error(`[OG] Failed to generate Probe noun ${nounId} image:`, error);
    return new Response('Failed to generate image', { status: 500 });
  }
}
