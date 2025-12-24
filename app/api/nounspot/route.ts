import { NextResponse } from 'next/server';

const NOUNSPOT_API = 'https://nounspot.com/api/spots/with-usernames';

/**
 * Proxy endpoint for Nounspot API
 * Avoids CORS issues by making server-to-server requests
 */
export async function GET() {
  try {
    const response = await fetch(NOUNSPOT_API, {
      headers: {
        'Accept': 'application/json',
      },
      // Cache for 5 minutes to reduce load on Nounspot
      next: { revalidate: 300 },
    });

    if (!response.ok) {
      return NextResponse.json(
        { error: `Nounspot API error: ${response.statusText}` },
        { status: response.status }
      );
    }

    const data = await response.json();
    
    return NextResponse.json(data, {
      headers: {
        'Cache-Control': 'public, s-maxage=300, stale-while-revalidate=600',
      },
    });
  } catch (error) {
    console.error('Nounspot proxy error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch spots from Nounspot' },
      { status: 500 }
    );
  }
}

