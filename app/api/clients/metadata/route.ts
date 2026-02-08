/**
 * Client Metadata API Route
 * Fetches favicon and meta tags from a client website URL.
 * NFT images are now indexed by Ponder -- no on-chain tokenURI calls needed.
 */

import { NextRequest, NextResponse } from 'next/server';

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const url = searchParams.get('url');

  if (!url) {
    return NextResponse.json({ error: 'url required' }, { status: 400 });
  }

  const result: {
    favicon?: string;
    title?: string;
    description?: string;
  } = {};

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
    console.error(`[metadata] Failed to fetch ${url}:`, e);
  }

  return NextResponse.json(result, {
    headers: {
      'Cache-Control': 'public, max-age=86400, s-maxage=86400',
    },
  });
}
