/**
 * Dynamic OG Image for Probe Noun Detail
 * Layout: berryos.wtf top-left, Noun title, trait list on left, noun image on right
 */

import { ImageResponse } from 'next/og';
import { NextRequest } from 'next/server';
import { neon } from '@neondatabase/serverless';
import { getTraitName } from '@/app/lib/nouns/utils/trait-name-utils';

// Use Node.js runtime — edge has issues with large SVG payloads + ImageData import
export const runtime = 'nodejs';

// Background colors (matches ImageData.bgcolors)
const BG_COLORS: Record<number, { hex: string }> = {
  0: { hex: 'd5d7e1' },
  1: { hex: 'e1d7d5' },
};

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
      SELECT id, svg, background, body, accessory, head, glasses
      FROM nouns WHERE id = ${nounId}
    `;

    if (result.length === 0) {
      return new Response('Noun not found', { status: 404 });
    }

    const noun = result[0];
    const bg = BG_COLORS[noun.background] || BG_COLORS[0];
    const bgColor = `#${bg.hex}`;

    // Resolve all trait names
    const traits = [
      { label: 'HEAD', value: getTraitName('head', noun.head) },
      { label: 'GLASSES', value: getTraitName('glasses', noun.glasses) },
      { label: 'ACCESSORY', value: getTraitName('accessory', noun.accessory) },
      { label: 'BODY', value: getTraitName('body', noun.body) },
      { label: 'BACKGROUND', value: getTraitName('background', noun.background) },
    ];

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
              width: 620,
              padding: '56px 0 56px 64px',
            }}
          >
            {/* berryos.wtf branding */}
            <div
              style={{
                display: 'flex',
                fontSize: 22,
                color: 'rgba(0,0,0,0.35)',
                fontWeight: 700,
                marginBottom: 20,
              }}
            >
              berryos.wtf
            </div>

            {/* Noun ID */}
            <div
              style={{
                display: 'flex',
                fontSize: 72,
                fontWeight: 700,
                color: '#1a1a1a',
                lineHeight: 1,
              }}
            >
              Noun {noun.id}
            </div>

            {/* Divider line */}
            <div
              style={{
                display: 'flex',
                width: 440,
                height: 3,
                background: 'rgba(0,0,0,0.12)',
                marginTop: 24,
                marginBottom: 28,
                borderRadius: 2,
              }}
            />

            {/* Trait list */}
            <div
              style={{
                display: 'flex',
                flexDirection: 'column',
                gap: 10,
              }}
            >
              {traits.map((trait) => (
                <div
                  key={trait.label}
                  style={{
                    display: 'flex',
                    alignItems: 'baseline',
                    gap: 12,
                  }}
                >
                  <span
                    style={{
                      fontSize: 16,
                      color: 'rgba(0,0,0,0.38)',
                      fontWeight: 700,
                      letterSpacing: 1,
                      width: 140,
                      flexShrink: 0,
                    }}
                  >
                    {trait.label}
                  </span>
                  <span
                    style={{
                      fontSize: 24,
                      color: '#1a1a1a',
                      fontWeight: 700,
                    }}
                  >
                    {trait.value}
                  </span>
                </div>
              ))}
            </div>
          </div>

          {/* Right side: Noun image */}
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              flex: 1,
              padding: 32,
            }}
          >
            <img
              src={svgToDataUri(noun.svg)}
              width={500}
              height={500}
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
