/**
 * Cron Job: Sync Nouns
 * Automatically syncs new nouns and settler info to the database
 * 
 * SETTLER SEMANTICS:
 * When someone settles auction N, they create noun N+1 (and N+2 if N+1 is a Nounder).
 * So the settler of auction N is attributed to noun N+1, because they "chose" what N+1 looks like.
 * 
 * - Noun 0: Genesis mint (no settler)
 * - Noun 1: First auction, kicked off by genesis (no settler)
 * - Noun 2+: Settler = person who settled the previous auction
 * 
 * Vercel Cron: configured in vercel.json
 */

import { NextRequest, NextResponse } from 'next/server';
import { neon } from '@neondatabase/serverless';
import { ImageData } from '@/app/lib/nouns/utils/image-data';
import { buildSVG } from '@/app/lib/nouns/utils/svg-builder';

const GOLDSKY_ENDPOINT = 'https://api.goldsky.com/api/public/project_cldf2o9pqagp43svvbk5u3kmo/subgraphs/nouns/prod/gn';
const AUCTION_HOUSE_ADDRESS = '0x830BD73E4184ceF73443C15111a1DF14e495C706';
const AUCTION_SETTLED_TOPIC = '0xc9f72b276a388619c6d185d146697036241880c36654b1a3ffdad07c24038d99';
const NOUNDERS_MULTISIG = '0x2573C60a6D127755aA2DC85e342F7da2378a0Cc5';

interface NounSeed {
  background: number;
  body: number;
  accessory: number;
  head: number;
  glasses: number;
}

function renderNounSVG(seed: NounSeed): string {
  const { background, body, accessory, head, glasses } = seed;
  const bgColor = `#${ImageData.bgcolors[background] || 'd5d7e1'}`;
  const parts = [
    ImageData.images.bodies[body],
    ImageData.images.accessories[accessory],
    ImageData.images.heads[head],
    ImageData.images.glasses[glasses],
  ].filter(Boolean);
  const paletteColors = ImageData.palette.map(c => c ? `#${c}` : 'transparent');
  return buildSVG(parts, paletteColors, bgColor);
}

function isNounderNoun(nounId: number): boolean {
  return nounId <= 1820 && nounId % 10 === 0;
}

async function queryGoldsky<T>(query: string, variables: Record<string, unknown>): Promise<T> {
  const response = await fetch(GOLDSKY_ENDPOINT, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ query, variables }),
  });
  const json = await response.json();
  if (json.errors) throw new Error(json.errors[0].message);
  return json.data;
}

export async function GET(request: NextRequest) {
  // Verify cron secret for security (Vercel sets this header)
  const authHeader = request.headers.get('authorization');
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    // Allow in development without secret
    if (process.env.NODE_ENV === 'production') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
  }

  const startTime = Date.now();
  const results = {
    inserted: 0,
    updated: 0,
    skipped: 0,
    errors: 0,
    duration: 0,
  };

  try {
    const sql = neon(process.env.DATABASE_URL!);
    const etherscanApiKey = process.env.ETHERSCAN_API_KEY!;

    // Get highest noun ID in database
    const highestResult = await sql`SELECT MAX(id) as max_id FROM nouns`;
    const highestId = highestResult[0]?.max_id ?? 0;

    // Fetch nouns from Goldsky
    // Note: The subgraph uses string IDs, so we can't rely on numeric sorting
    // Instead, we fetch all nouns from a numeric range by using multiple targeted queries
    const minIdToFetch = Math.max(0, highestId - 5); // Small buffer for safety
    const maxIdToFetch = highestId + 20; // Look ahead for new nouns
    
    // Build a list of IDs to query for
    const idsToCheck: string[] = [];
    for (let i = minIdToFetch; i <= maxIdToFetch; i++) {
      idsToCheck.push(i.toString());
    }
    
    const nounsQuery = `
      query GetNounsByIds($ids: [ID!]!) {
        nouns(where: { id_in: $ids }) {
          id
          seed { background, body, accessory, head, glasses }
          owner { id }
        }
      }
    `;
    const { nouns } = await queryGoldsky<{ nouns: Array<{
      id: string;
      seed: { background: string; body: string; accessory: string; head: string; glasses: string };
      owner: { id: string };
    }> }>(nounsQuery, { ids: idsToCheck });

    // Fetch recent auctions
    const auctionsQuery = `
      query GetRecentAuctions($first: Int!) {
        auctions(first: $first, orderBy: startTime, orderDirection: desc, where: { settled: true }) {
          id
          noun { id }
          amount
          bidder { id }
          endTime
        }
      }
    `;
    const { auctions } = await queryGoldsky<{ auctions: Array<{
      id: string;
      noun: { id: string };
      amount: string;
      bidder: { id: string } | null;
      endTime: string;
    }> }>(auctionsQuery, { first: 50 });

    const auctionMap = new Map(auctions.map(a => [parseInt(a.noun.id), a]));

    // Process new nouns
    for (const noun of nouns) {
      const nounId = parseInt(noun.id);

      // Check if exists
      const existing = await sql`SELECT id FROM nouns WHERE id = ${nounId}`;
      if (existing.length > 0) {
        results.skipped++;
        continue;
      }

      try {
        const seed: NounSeed = {
          background: parseInt(noun.seed.background),
          body: parseInt(noun.seed.body),
          accessory: parseInt(noun.seed.accessory),
          head: parseInt(noun.seed.head),
          glasses: parseInt(noun.seed.glasses),
        };

        const svg = renderNounSVG(seed);
        const isNounder = isNounderNoun(nounId);
        const auction = auctionMap.get(nounId);

        let settledAt: string;
        let settledByAddress: string;
        let settledTxHash: string;
        let winnerAddress: string | null;
        let winningBid: string | null;

        if (nounId <= 1) {
          // Genesis nouns - no settler
          settledAt = new Date(0).toISOString();
          settledByAddress = '0x' + '0'.repeat(40);
          settledTxHash = '0x' + '0'.repeat(64);
          winnerAddress = isNounder ? NOUNDERS_MULTISIG : (auction?.bidder?.id || null);
          winningBid = auction ? (auction.amount !== '0' ? auction.amount : null) : null;
        } else if (isNounder && !auction) {
          // Nounder noun
          settledAt = new Date(0).toISOString();
          settledByAddress = '0x' + '0'.repeat(40); // Will be updated by settler sync
          settledTxHash = '0x' + '0'.repeat(64);
          winnerAddress = NOUNDERS_MULTISIG;
          winningBid = null;
        } else if (auction) {
          // Regular auctioned noun - settler will be updated separately
          settledAt = new Date(parseInt(auction.endTime) * 1000).toISOString();
          settledByAddress = '0x' + '0'.repeat(40);
          settledTxHash = '0x' + '0'.repeat(64);
          winnerAddress = auction.bidder?.id || null;
          winningBid = auction.amount !== '0' ? auction.amount : null;
        } else {
          // Edge case
          settledAt = new Date().toISOString();
          settledByAddress = '0x' + '0'.repeat(40);
          settledTxHash = '0x' + '0'.repeat(64);
          winnerAddress = noun.owner.id;
          winningBid = null;
        }

        await sql`
          INSERT INTO nouns (id, background, body, accessory, head, glasses, svg,
            settled_by_address, settled_at, settled_tx_hash, winning_bid, winner_address)
          VALUES (${nounId}, ${seed.background}, ${seed.body}, ${seed.accessory},
            ${seed.head}, ${seed.glasses}, ${svg}, ${settledByAddress}, ${settledAt},
            ${settledTxHash}, ${winningBid}, ${winnerAddress})
          ON CONFLICT (id) DO NOTHING
        `;

        results.inserted++;
      } catch (error) {
        console.error(`Error inserting noun ${nounId}:`, error);
        results.errors++;
      }
    }

    // Update settler info for nouns missing it (limit to 10 per run to respect rate limits)
    // For each noun missing settler, we need to find who settled the PREVIOUS noun's auction
    const missingSettler = await sql`
      SELECT id FROM nouns 
      WHERE settled_by_address = '0x0000000000000000000000000000000000000000' 
      AND id > 1
      ORDER BY id DESC 
      LIMIT 10
    `;

    for (const { id: nounId } of missingSettler) {
      try {
        // To find who "chose" this noun, we need to find who settled the previous auction
        // If this noun is a Nounder (N % 10 === 0), settler settled N-1
        // If previous noun is a Nounder, settler settled N-2
        
        let settledNounId: number;
        if (isNounderNoun(nounId)) {
          // This is a Nounder noun, settler settled the previous auctioned noun
          settledNounId = nounId - 1;
        } else if (isNounderNoun(nounId - 1)) {
          // Previous noun was a Nounder, so settler settled two nouns ago
          settledNounId = nounId - 2;
        } else {
          // Normal case
          settledNounId = nounId - 1;
        }
        
        // Find the AuctionSettled event for settledNounId
        const paddedNounId = '0x' + settledNounId.toString(16).padStart(64, '0');
        const logsUrl = new URL('https://api.etherscan.io/v2/api');
        logsUrl.searchParams.set('chainid', '1');
        logsUrl.searchParams.set('module', 'logs');
        logsUrl.searchParams.set('action', 'getLogs');
        logsUrl.searchParams.set('address', AUCTION_HOUSE_ADDRESS);
        logsUrl.searchParams.set('topic0', AUCTION_SETTLED_TOPIC);
        logsUrl.searchParams.set('topic1', paddedNounId);
        logsUrl.searchParams.set('fromBlock', '0');
        logsUrl.searchParams.set('toBlock', 'latest');
        logsUrl.searchParams.set('apikey', etherscanApiKey);

        const logsRes = await fetch(logsUrl.toString());
        const logsData = await logsRes.json();

        if (logsData.status === '1' && logsData.result?.length > 0) {
          const log = logsData.result[0];
          
          // Get transaction sender (the settler)
          const txUrl = new URL('https://api.etherscan.io/v2/api');
          txUrl.searchParams.set('chainid', '1');
          txUrl.searchParams.set('module', 'proxy');
          txUrl.searchParams.set('action', 'eth_getTransactionByHash');
          txUrl.searchParams.set('txhash', log.transactionHash);
          txUrl.searchParams.set('apikey', etherscanApiKey);

          const txRes = await fetch(txUrl.toString());
          const txData = await txRes.json();

          if (txData.result?.from) {
            // Etherscan returns timestamp in decimal (seconds since epoch)
            const timestamp = parseInt(log.timeStamp, 10);
            await sql`
              UPDATE nouns 
              SET settled_by_address = ${txData.result.from.toLowerCase()},
                  settled_tx_hash = ${log.transactionHash},
                  settled_at = ${new Date(timestamp * 1000).toISOString()}
              WHERE id = ${nounId}
            `;
            results.updated++;
          }
        }

        // Rate limit
        await new Promise(r => setTimeout(r, 200));
      } catch (error) {
        console.error(`Error updating settler for noun ${nounId}:`, error);
      }
    }

    results.duration = Date.now() - startTime;

    return NextResponse.json({
      success: true,
      message: `Sync complete: ${results.inserted} inserted, ${results.updated} updated, ${results.skipped} skipped`,
      results,
    });
  } catch (error) {
    console.error('[Cron] Sync nouns failed:', error);
    return NextResponse.json(
      { success: false, error: String(error), results },
      { status: 500 }
    );
  }
}
