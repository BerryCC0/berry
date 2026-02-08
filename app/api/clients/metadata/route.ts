/**
 * Client Metadata API Route
 * Fetches favicon and meta tags from a client website URL,
 * and optionally fetches the NFT image from tokenURI on-chain.
 */

import { NextRequest, NextResponse } from 'next/server';
import { createPublicClient, http } from 'viem';
import { mainnet } from 'viem/chains';
import { ClientRewardsABI } from '@/app/lib/nouns/abis/ClientRewards';

const CLIENT_REWARDS_ADDRESS = '0x883860178F95d0C82413eDc1D6De530cB4771d55' as const;

const viemClient = createPublicClient({
  chain: mainnet,
  transport: http(),
});

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const url = searchParams.get('url');
  const tokenId = searchParams.get('tokenId');

  if (!url && !tokenId) {
    return NextResponse.json({ error: 'url or tokenId required' }, { status: 400 });
  }

  const result: {
    favicon?: string;
    title?: string;
    description?: string;
    nftImage?: string;
  } = {};

  // Fetch website metadata (favicon, title, description)
  if (url) {
    try {
      const response = await fetch(url, {
        headers: { 'User-Agent': 'Mozilla/5.0 (compatible; BerryOS/1.0)' },
        signal: AbortSignal.timeout(5000),
      });

      if (response.ok) {
        const html = await response.text();
        const baseUrl = new URL(url);

        // Extract favicon
        const iconMatch = html.match(/<link[^>]*rel=["'](?:icon|shortcut icon|apple-touch-icon)["'][^>]*href=["']([^"']+)["']/i)
          || html.match(/<link[^>]*href=["']([^"']+)["'][^>]*rel=["'](?:icon|shortcut icon|apple-touch-icon)["']/i);

        if (iconMatch?.[1]) {
          try {
            result.favicon = new URL(iconMatch[1], baseUrl.origin).href;
          } catch {
            result.favicon = `${baseUrl.origin}/favicon.ico`;
          }
        } else {
          result.favicon = `${baseUrl.origin}/favicon.ico`;
        }

        // Extract og:title or <title>
        const ogTitleMatch = html.match(/<meta[^>]*property=["']og:title["'][^>]*content=["']([^"']+)["']/i)
          || html.match(/<meta[^>]*content=["']([^"']+)["'][^>]*property=["']og:title["']/i);
        if (ogTitleMatch?.[1]) {
          result.title = ogTitleMatch[1];
        } else {
          const titleMatch = html.match(/<title[^>]*>([^<]+)<\/title>/i);
          if (titleMatch?.[1]) result.title = titleMatch[1].trim();
        }

        // Extract description
        const descMatch = html.match(/<meta[^>]*name=["']description["'][^>]*content=["']([^"']+)["']/i)
          || html.match(/<meta[^>]*content=["']([^"']+)["'][^>]*name=["']description["']/i)
          || html.match(/<meta[^>]*property=["']og:description["'][^>]*content=["']([^"']+)["']/i);
        if (descMatch?.[1]) result.description = descMatch[1];
      }
    } catch (e) {
      // Website fetch failed -- continue with NFT image if requested
      console.error(`[metadata] Failed to fetch ${url}:`, e);
    }
  }

  // Fetch NFT image from tokenURI
  if (tokenId) {
    try {
      const uri = await viemClient.readContract({
        address: CLIENT_REWARDS_ADDRESS,
        abi: ClientRewardsABI,
        functionName: 'tokenURI',
        args: [BigInt(tokenId)],
      });

      if (typeof uri === 'string') {
        // Parse data URI (data:application/json;base64,...) or fetch URL
        let metadata: any;
        if (uri.startsWith('data:application/json;base64,')) {
          const json = Buffer.from(uri.slice('data:application/json;base64,'.length), 'base64').toString('utf-8');
          metadata = JSON.parse(json);
        } else if (uri.startsWith('data:application/json,')) {
          metadata = JSON.parse(decodeURIComponent(uri.slice('data:application/json,'.length)));
        } else if (uri.startsWith('http')) {
          const resp = await fetch(uri, { signal: AbortSignal.timeout(5000) });
          if (resp.ok) metadata = await resp.json();
        }

        if (metadata?.image) {
          result.nftImage = metadata.image;
        }
      }
    } catch (e) {
      console.error(`[metadata] Failed to fetch tokenURI for ${tokenId}:`, e);
    }
  }

  return NextResponse.json(result, {
    headers: {
      'Cache-Control': 'public, max-age=86400, s-maxage=86400',
    },
  });
}
