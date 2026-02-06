/**
 * Dynamic OG Image for Probe Noun Detail
 * Shows a single Noun large with its ID and auction info
 */

import { ImageResponse } from 'next/og';
import { NextRequest } from 'next/server';
import { neon } from '@neondatabase/serverless';

// Use Node.js runtime — edge has issues with large SVG payloads + ImageData import
export const runtime = 'nodejs';

// Background colors (matches ImageData.bgcolors — inlined to avoid huge import)
const BG_COLORS: Record<number, { hex: string; name: string }> = {
  0: { hex: 'd5d7e1', name: 'Cool' },
  1: { hex: 'e1d7d5', name: 'Warm' },
};

// Cache the font fetch so it's only done once per cold start
let fontData: ArrayBuffer | null = null;
async function getComicNeueFont(): Promise<ArrayBuffer> {
  if (fontData) return fontData;
  const res = await fetch(
    'https://fonts.gstatic.com/s/comicneue/v8/4UaErEJDsxBrF37olUeD_wHLwpteLwtHJlc.woff2'
  );
  fontData = await res.arrayBuffer();
  return fontData;
}

/**
 * Safely encode SVG string to a base64 data URI using Buffer (Node.js).
 */
function svgToDataUri(svg: string): string {
  const b64 = Buffer.from(svg, 'utf-8').toString('base64');
  return `data:image/svg+xml;base64,${b64}`;
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
    const font = await getComicNeueFont();
    const sql = neon(process.env.DATABASE_URL!);

    const result = await sql`
      SELECT id, svg, background,
             winning_bid, winner_address, winner_ens
      FROM nouns WHERE id = ${nounId}
    `;

    if (result.length === 0) {
      return new Response('Noun not found', { status: 404 });
    }

    const noun = result[0];
    const bg = BG_COLORS[noun.background] || BG_COLORS[0];
    const bgColor = `#${bg.hex}`;

    // Format winning bid
    let bidDisplay = '';
    if (noun.winning_bid) {
      const ethValue = Number(BigInt(noun.winning_bid)) / 1e18;
      bidDisplay = `Ξ ${ethValue.toFixed(2)}`;
    }

    const ownerDisplay = noun.winner_ens || (noun.winner_address
      ? `${noun.winner_address.slice(0, 6)}...${noun.winner_address.slice(-4)}`
      : '');

    return new ImageResponse(
      (
        <div
          style={{
            display: 'flex',
            width: '100%',
            height: '100%',
            background: bgColor,
            fontFamily: '"Comic Neue"',
          }}
        >
          {/* Left side: Noun image */}
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              width: 630,
              height: '100%',
              padding: 40,
            }}
          >
            <img
              src={svgToDataUri(noun.svg)}
              width={480}
              height={480}
            />
          </div>

          {/* Right side: Info */}
          <div
            style={{
              display: 'flex',
              flexDirection: 'column',
              justifyContent: 'center',
              flex: 1,
              padding: '40px 48px 40px 0',
              gap: 8,
            }}
          >
            {/* Noun ID */}
            <div style={{ display: 'flex', fontSize: 64, fontWeight: 700, color: '#1a1a1a' }}>
              Noun {noun.id}
            </div>

            {/* Bid + Owner */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 4, marginTop: 8, marginBottom: 8 }}>
              {bidDisplay ? (
                <div style={{ display: 'flex', fontSize: 28, color: '#333', fontWeight: 700 }}>
                  {bidDisplay}
                </div>
              ) : (
                <div style={{ display: 'flex', fontSize: 28, color: '#333', fontWeight: 700 }}>
                  Nounders
                </div>
              )}
              {ownerDisplay ? (
                <div style={{ display: 'flex', fontSize: 20, color: '#555' }}>
                  Won by {ownerDisplay}
                </div>
              ) : null}
            </div>

            {/* Background trait */}
            <div style={{ display: 'flex', alignItems: 'baseline', gap: 8, marginTop: 12 }}>
              <span style={{ fontSize: 14, color: '#888', fontWeight: 700, letterSpacing: 0.5 }}>
                BACKGROUND
              </span>
              <span style={{ fontSize: 20, color: '#333', fontWeight: 700 }}>
                {bg.name}
              </span>
            </div>

            {/* Branding */}
            <div
              style={{
                display: 'flex',
                marginTop: 'auto',
                fontSize: 18,
                color: 'rgba(0,0,0,0.3)',
                fontWeight: 700,
              }}
            >
              Probe — Berry OS
            </div>
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
