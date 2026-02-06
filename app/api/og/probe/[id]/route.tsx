/**
 * Dynamic OG Image for Probe Noun Detail
 * Shows a single Noun large with its ID and traits
 */

import { ImageResponse } from 'next/og';
import { NextRequest } from 'next/server';
import { neon } from '@neondatabase/serverless';
import { ImageData } from '@/app/lib/nouns/utils/image-data';
import { getTraitName } from '@/app/lib/nouns/utils/trait-name-utils';

export const runtime = 'edge';

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
      SELECT id, svg, background, body, accessory, head, glasses,
             winning_bid, winner_address, winner_ens
      FROM nouns WHERE id = ${nounId}
    `;

    if (result.length === 0) {
      return new Response('Noun not found', { status: 404 });
    }

    const noun = result[0];
    const bgHex = ImageData.bgcolors[noun.background] || 'd5d7e1';
    const bgColor = `#${bgHex}`;

    // Get trait names (background is "Warm" or "Cool")
    const traits = [
      { label: 'HEAD', value: getTraitName('head', noun.head) },
      { label: 'GLASSES', value: getTraitName('glasses', noun.glasses) },
      { label: 'ACCESSORY', value: getTraitName('accessory', noun.accessory) },
      { label: 'BODY', value: getTraitName('body', noun.body) },
      { label: 'BACKGROUND', value: getTraitName('background', noun.background) },
    ];

    // Format winning bid
    let bidDisplay = '';
    if (noun.winning_bid) {
      const ethValue = Number(BigInt(noun.winning_bid)) / 1e18;
      bidDisplay = `Ξ ${ethValue.toFixed(2)}`;
    }

    const ownerDisplay = noun.winner_ens || (noun.winner_address
      ? `${noun.winner_address.slice(0, 6)}…${noun.winner_address.slice(-4)}`
      : '');

    return new ImageResponse(
      (
        <div
          style={{
            display: 'flex',
            width: '100%',
            height: '100%',
            background: bgColor,
            fontFamily: '"Comic Neue", cursive',
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
              src={`data:image/svg+xml;base64,${btoa(noun.svg)}`}
              width={480}
              height={480}
              style={{ imageRendering: 'pixelated', borderRadius: 12 }}
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
            <div style={{ display: 'flex', fontSize: 64, fontWeight: 800, color: '#1a1a1a' }}>
              Noun {noun.id}
            </div>

            {/* Bid + Owner */}
            {(bidDisplay || ownerDisplay) && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 4, marginTop: 8, marginBottom: 8 }}>
                {bidDisplay && (
                  <div style={{ display: 'flex', fontSize: 28, color: '#333', fontWeight: 700 }}>
                    {bidDisplay}
                  </div>
                )}
                {ownerDisplay && (
                  <div style={{ display: 'flex', fontSize: 20, color: '#555' }}>
                    Won by {ownerDisplay}
                  </div>
                )}
              </div>
            )}

            {/* Traits */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 6, marginTop: 12 }}>
              {traits.map((trait) => (
                <div key={trait.label} style={{ display: 'flex', alignItems: 'baseline', gap: 8 }}>
                  <span style={{ fontSize: 14, color: '#888', fontWeight: 700, letterSpacing: 0.5, width: 100 }}>
                    {trait.label}
                  </span>
                  <span style={{ fontSize: 20, color: '#333', fontWeight: 600 }}>
                    {trait.value}
                  </span>
                </div>
              ))}
            </div>

            {/* Branding */}
            <div
              style={{
                display: 'flex',
                marginTop: 'auto',
                fontSize: 18,
                color: 'rgba(0,0,0,0.3)',
                fontWeight: 600,
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
