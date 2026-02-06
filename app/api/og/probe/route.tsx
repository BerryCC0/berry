/**
 * Dynamic OG Image for Probe (Grid View)
 * Shows a grid of recent Noun thumbnails as the preview image
 */

import { ImageResponse } from 'next/og';
import { neon } from '@neondatabase/serverless';

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

export async function GET() {
  try {
    const font = await getComicNeueFont();
    const sql = neon(process.env.DATABASE_URL!);

    // Fetch the 24 most recent nouns (fills a 6x4 grid)
    const nouns = await sql`
      SELECT id, svg, background FROM nouns
      ORDER BY id DESC
      LIMIT 24
    `;

    return new ImageResponse(
      (
        <div
          style={{
            display: 'flex',
            flexDirection: 'column',
            width: '100%',
            height: '100%',
            background: '#e8e4dc',
            fontFamily: '"Comic Neue", cursive',
          }}
        >
          {/* Header */}
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              padding: '20px 32px 12px',
            }}
          >
            <div
              style={{
                display: 'flex',
                alignItems: 'baseline',
                gap: 12,
              }}
            >
              <span style={{ fontSize: 42, fontWeight: 800, color: '#1a1a1a' }}>
                Probe
              </span>
              <span style={{ fontSize: 22, color: '#666', fontWeight: 600 }}>
                Nouns Explorer
              </span>
            </div>
            <span style={{ fontSize: 20, color: 'rgba(0,0,0,0.35)', fontWeight: 600 }}>
              Berry OS
            </span>
          </div>

          {/* Noun Grid: 6 columns x 4 rows */}
          <div
            style={{
              display: 'flex',
              flexWrap: 'wrap',
              padding: '4px 24px 24px',
              gap: 6,
              flex: 1,
            }}
          >
            {nouns.map((noun) => (
              <div
                key={noun.id}
                style={{
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  width: 182,
                  height: 128,
                  borderRadius: 6,
                  overflow: 'hidden',
                  background: '#fff',
                  border: '2px solid rgba(0,0,0,0.08)',
                }}
              >
                <img
                  src={`data:image/svg+xml;base64,${btoa(noun.svg)}`}
                  width={110}
                  height={110}
                  style={{ imageRendering: 'pixelated' }}
                />
                <span style={{ fontSize: 13, color: '#666', fontWeight: 700, marginTop: -2 }}>
                  {noun.id}
                </span>
              </div>
            ))}
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
    console.error('[OG] Failed to generate Probe grid image:', error);

    // Fallback: simple text-based OG image
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
            background: '#e8e4dc',
            fontFamily: 'cursive',
          }}
        >
          <span style={{ fontSize: 72, fontWeight: 800, color: '#1a1a1a' }}>Probe</span>
          <span style={{ fontSize: 32, color: '#666', marginTop: 12 }}>Nouns Explorer</span>
          <span style={{ fontSize: 20, color: 'rgba(0,0,0,0.35)', marginTop: 24 }}>Berry OS</span>
        </div>
      ),
      { width: 1200, height: 630 }
    );
  }
}
