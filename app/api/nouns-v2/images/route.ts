/**
 * GET /api/nouns-v2/images?ids=0,1,2
 *
 * Batch-renders V2 noun art server-side. Each id's on-chain `dataURI(tokenId)`
 * is read individually with bounded concurrency, so the whole grid loads from
 * one HTTP round-trip instead of dozens of throttled client eth_calls. (A single
 * multicall3 aggregate of many nouns overflows the RPC's response limit — each
 * SVG is ~10KB — so individual reads are the reliable path here.) Burned /
 * non-existent tokens revert and are simply omitted.
 */

import { NextResponse } from 'next/server';
import { getMainnetClient } from '@/app/lib/rpc';
import { nounV2TokenAbi } from '@/app/lib/nouns-v2/abis/nounV2Token';
import { V2_ADDRESSES } from '@/OS/Apps/nouns/NounsV2/contracts';
import { parseNounDataURI } from '@/OS/Apps/nouns/NounsV2/utils/parseDataUri';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const MAX_IDS = 200;
const CONCURRENCY = 8;

export async function GET(req: Request) {
  const url = new URL(req.url);
  const idsParam = url.searchParams.get('ids') ?? '';

  const ids = [
    ...new Set(
      idsParam
        .split(',')
        .map((s) => parseInt(s.trim(), 10))
        .filter((n) => Number.isInteger(n) && n >= 0)
    ),
  ].slice(0, MAX_IDS);

  if (ids.length === 0) {
    return NextResponse.json({ images: {} });
  }

  try {
    const client = getMainnetClient();
    const images: Record<number, string> = {};

    for (let i = 0; i < ids.length; i += CONCURRENCY) {
      const batch = ids.slice(i, i + CONCURRENCY);
      const results = await Promise.allSettled(
        batch.map((id) =>
          client.readContract({
            address: V2_ADDRESSES.token,
            abi: nounV2TokenAbi,
            functionName: 'dataURI',
            args: [BigInt(id)],
          })
        )
      );

      results.forEach((res, j) => {
        if (res.status === 'fulfilled') {
          const img = parseNounDataURI(res.value);
          if (img) images[batch[j]] = img;
        }
      });
    }

    return NextResponse.json({ images });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
