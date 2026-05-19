/**
 * OpenSea NFT Metadata API Route
 * Returns the basic display info (image, name, collection) for an NFT
 * by contract + tokenId. Used by the proposal/candidate transaction
 * summary to render rich preview cards for `Buy NFT` actions.
 *
 * Requires OPENSEA_API_KEY env var. Returns 503 when missing.
 */

import { NextRequest, NextResponse } from 'next/server';
import { isAddress } from 'viem';

const OPENSEA_API_KEY = process.env.OPENSEA_API_KEY;
const OPENSEA_API_BASE = 'https://api.opensea.io/api/v2';

export async function GET(request: NextRequest) {
  if (!OPENSEA_API_KEY) {
    return NextResponse.json(
      { error: 'OPENSEA_API_KEY env var is not configured.' },
      { status: 503 },
    );
  }

  const { searchParams } = new URL(request.url);
  const contract = searchParams.get('contract');
  const tokenId = searchParams.get('tokenId');

  if (!contract || !isAddress(contract)) {
    return NextResponse.json(
      { error: 'Missing or invalid `contract` parameter.' },
      { status: 400 },
    );
  }
  if (!tokenId || !/^\d+$/.test(tokenId)) {
    return NextResponse.json(
      { error: 'Missing or invalid `tokenId` parameter.' },
      { status: 400 },
    );
  }

  try {
    const res = await fetch(
      `${OPENSEA_API_BASE}/chain/ethereum/contract/${contract}/nfts/${tokenId}`,
      {
        headers: {
          Accept: 'application/json',
          'X-API-KEY': OPENSEA_API_KEY,
        },
      },
    );
    if (!res.ok) {
      return NextResponse.json(
        { error: `OpenSea NFT lookup failed: ${res.status}` },
        { status: 502 },
      );
    }
    const json = await res.json();
    return NextResponse.json(json, {
      headers: {
        // Metadata is effectively static — cache aggressively at the edge.
        'Cache-Control': 'public, s-maxage=3600, stale-while-revalidate=86400',
      },
    });
  } catch (e) {
    return NextResponse.json(
      {
        error: 'Unexpected error talking to OpenSea',
        detail: e instanceof Error ? e.message : String(e),
      },
      { status: 500 },
    );
  }
}
