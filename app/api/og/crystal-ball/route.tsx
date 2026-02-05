/**
 * Dynamic OG Image for Crystal Ball
 * Generates a mystical preview image for the Noun O' Clock link
 */

import { ImageResponse } from 'next/og';

export const runtime = 'edge';

export async function GET() {
  // Fetch the crystal ball icon
  const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || 'https://berryos.wtf';
  const iconUrl = `${baseUrl}/icons/crystal-ball.png`;

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
          background: 'linear-gradient(135deg, #0f0c29 0%, #302b63 50%, #24243e 100%)',
          fontFamily: 'system-ui',
        }}
      >
        {/* Glowing orb effect */}
        <div
          style={{
            display: 'flex',
            position: 'absolute',
            width: 400,
            height: 400,
            borderRadius: '50%',
            background: 'radial-gradient(circle, rgba(138,43,226,0.3) 0%, rgba(138,43,226,0) 70%)',
            filter: 'blur(40px)',
          }}
        />

        {/* Crystal Ball Icon */}
        <img
          src={iconUrl}
          alt=""
          width={180}
          height={180}
          style={{
            marginBottom: 32,
          }}
        />

        {/* Title */}
        <div
          style={{
            display: 'flex',
            fontSize: 72,
            fontWeight: 800,
            color: '#fff',
            textShadow: '0 4px 20px rgba(138,43,226,0.5)',
            marginBottom: 16,
          }}
        >
          Noun O&apos; Clock
        </div>

        {/* Subtitle */}
        <div
          style={{
            display: 'flex',
            fontSize: 36,
            color: 'rgba(255,255,255,0.7)',
          }}
        >
          Settle the next Noun.
        </div>

        {/* Berry OS Branding */}
        <div
          style={{
            display: 'flex',
            position: 'absolute',
            bottom: 32,
            right: 48,
            fontSize: 20,
            color: 'rgba(255,255,255,0.4)',
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
