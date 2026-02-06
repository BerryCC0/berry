/**
 * Dynamic OG Image for Probe (Grid View)
 * Shows a grid of recent Noun thumbnails as the preview image
 */

import { ImageResponse } from 'next/og';
import { neon } from '@neondatabase/serverless';

// Use Node.js runtime — edge has issues with large SVG payloads
export const runtime = 'nodejs';

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

export async function GET() {
  try {
    const font = await getComicNeueFont();
    const sql = neon(process.env.DATABASE_URL!);

    // Fetch 12 most recent nouns (6x2 grid — keeps payload manageable)
    const nouns = await sql`
      SELECT id, svg FROM nouns
      ORDER BY id DESC
      LIMIT 12
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
            fontFamily: '"Comic Neue"',
          }}
        >
          {/* Header */}
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              padding: '24px 40px 16px',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'baseline', gap: 14 }}>
              <span style={{ fontSize: 48, fontWeight: 700, color: '#1a1a1a' }}>
                Probe
              </span>
              <span style={{ fontSize: 24, color: '#666', fontWeight: 700 }}>
                Nouns Explorer
              </span>
            </div>
            <span style={{ fontSize: 22, color: 'rgba(0,0,0,0.35)', fontWeight: 700 }}>
              Berry OS
            </span>
          </div>

          {/* Noun Grid: 6 columns x 2 rows */}
          <div
            style={{
              display: 'flex',
              flexWrap: 'wrap',
              padding: '8px 32px 32px',
              gap: 10,
              flex: 1,
              alignContent: 'flex-start',
            }}
          >
            {nouns.map((noun) => (
              <div
                key={noun.id}
                style={{
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  width: 176,
                  borderRadius: 8,
                  overflow: 'hidden',
                  background: '#fff',
                  border: '2px solid rgba(0,0,0,0.08)',
                  padding: '6px 6px 4px',
                }}
              >
                <img
                  src={svgToDataUri(noun.svg)}
                  width={160}
                  height={160}
                />
                <span style={{ fontSize: 16, color: '#555', fontWeight: 700, marginTop: 2 }}>
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
          }}
        >
          <span style={{ fontSize: 72, fontWeight: 700, color: '#1a1a1a' }}>Probe</span>
          <span style={{ fontSize: 32, color: '#666', marginTop: 12 }}>Nouns Explorer</span>
          <span style={{ fontSize: 20, color: 'rgba(0,0,0,0.35)', marginTop: 24 }}>Berry OS</span>
        </div>
      ),
      { width: 1200, height: 630 }
    );
  }
}
