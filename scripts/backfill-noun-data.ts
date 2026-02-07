/**
 * Backfill Noun Data Script
 * Fixes winning_bid, winner_address, and settled_at for all nouns by pulling
 * accurate data from the Goldsky subgraph and Etherscan.
 *
 * Issues this fixes:
 *   1. winning_bid was null (not stored during initial insert)
 *   2. winner_address was the auction house contract, not the actual winner
 *   3. settled_at was epoch (hex timestamp parsed as decimal)
 *
 * Usage: npx tsx scripts/backfill-noun-data.ts
 */

import { neon } from '@neondatabase/serverless';
import { config } from 'dotenv';

config({ path: '.env.local' });
config({ path: '.env' });

const GOLDSKY_ENDPOINT = 'https://api.goldsky.com/api/public/project_cldf2o9pqagp43svvbk5u3kmo/subgraphs/nouns/prod/gn';
const AUCTION_HOUSE_ADDRESS = '0x830bd73e4184cef73443c15111a1df14e495c706';
const AUCTION_SETTLED_TOPIC = '0xc9f72b276a388619c6d185d146697036241880c36654b1a3ffdad07c24038d99';

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

async function main() {
  const databaseUrl = process.env.DATABASE_URL;
  const etherscanApiKey = process.env.ETHERSCAN_API_KEY;

  if (!databaseUrl) { console.error('DATABASE_URL is not set'); process.exit(1); }
  if (!etherscanApiKey) { console.error('ETHERSCAN_API_KEY is not set'); process.exit(1); }

  const sql = neon(databaseUrl);

  // ── Step 1: Fix winning_bid and winner_address from subgraph ──
  console.log('\n── Step 1: Fixing winning_bid and winner_address from subgraph ──');

  // Get all nouns that need fixing (null winning_bid or auction house as winner)
  const needsFix = await sql`
    SELECT id FROM legacy_nouns
    WHERE winning_bid IS NULL
       OR LOWER(winner_address) = ${AUCTION_HOUSE_ADDRESS}
    ORDER BY id DESC
  `;

  console.log(`  ${needsFix.length} nouns need winning_bid / winner fix`);

  // Fetch auctions from subgraph in batches
  const BATCH = 100;
  let fixedBids = 0;
  let fixedWinners = 0;

  for (let i = 0; i < needsFix.length; i += BATCH) {
    const batch = needsFix.slice(i, i + BATCH);
    const ids = batch.map(n => String(n.id));

    // Fetch auctions with highest bid to get actual winner
    const auctionQuery = `
      query GetAuctions($ids: [ID!]!) {
        auctions(where: { id_in: $ids }) {
          id
          amount
          bids(orderBy: amount, orderDirection: desc, first: 1) {
            bidder { id }
          }
        }
      }
    `;
    const { auctions } = await queryGoldsky<{
      auctions: Array<{
        id: string;
        amount: string;
        bids: Array<{ bidder: { id: string } }>;
      }>;
    }>(auctionQuery, { ids });

    const auctionMap = new Map(auctions.map(a => [a.id, a]));

    for (const { id } of batch) {
      const auction = auctionMap.get(String(id));

      const winningBid = auction && auction.amount !== '0' ? auction.amount : null;
      // Winner is the highest bidder from the auction's bids
      const winnerAddress = auction?.bids?.[0]?.bidder?.id || null;

      try {
        const result = await sql`
          UPDATE legacy_nouns
          SET winning_bid = COALESCE(${winningBid}, winning_bid),
              winner_address = CASE
                WHEN LOWER(winner_address) = ${AUCTION_HOUSE_ADDRESS} AND ${winnerAddress}::text IS NOT NULL
                  THEN ${winnerAddress}
                WHEN winner_address IS NULL AND ${winnerAddress}::text IS NOT NULL
                  THEN ${winnerAddress}
                ELSE winner_address
              END,
              winner_ens = CASE
                WHEN LOWER(winner_address) = ${AUCTION_HOUSE_ADDRESS} THEN NULL
                ELSE winner_ens
              END
          WHERE id = ${id}
        `;
        if (winningBid) fixedBids++;
        if (winnerAddress && winnerAddress.toLowerCase() !== AUCTION_HOUSE_ADDRESS) fixedWinners++;
        void result;
      } catch (error) {
        console.error(`  Error updating noun ${id}:`, error);
      }
    }

    console.log(`  Processed ${Math.min(i + BATCH, needsFix.length)}/${needsFix.length} (${fixedBids} bids, ${fixedWinners} winners fixed)`);
    await new Promise(r => setTimeout(r, 200));
  }

  // ── Step 2: Fix settled_at timestamps ──
  console.log('\n── Step 2: Fixing settled_at timestamps from Etherscan ──');

  const badTimestamps = await sql`
    SELECT id, settled_tx_hash FROM legacy_nouns
    WHERE settled_tx_hash IS NOT NULL
      AND settled_tx_hash != ${'0x' + '0'.repeat(64)}
      AND (settled_at IS NULL OR settled_at <= '1970-01-02T00:00:00Z')
    ORDER BY id DESC
  `;

  console.log(`  ${badTimestamps.length} nouns need timestamp fix`);
  let fixedTimestamps = 0;

  for (let i = 0; i < badTimestamps.length; i++) {
    const { id, settled_tx_hash } = badTimestamps[i];

    try {
      // Get block number from tx receipt
      const receiptUrl = new URL('https://api.etherscan.io/v2/api');
      receiptUrl.searchParams.set('chainid', '1');
      receiptUrl.searchParams.set('module', 'proxy');
      receiptUrl.searchParams.set('action', 'eth_getTransactionReceipt');
      receiptUrl.searchParams.set('txhash', settled_tx_hash);
      receiptUrl.searchParams.set('apikey', etherscanApiKey);

      const receiptRes = await fetch(receiptUrl.toString());
      const receiptData = await receiptRes.json();

      if (receiptData.result?.blockNumber) {
        const blockHex = receiptData.result.blockNumber;

        // Get block timestamp
        const blockUrl = new URL('https://api.etherscan.io/v2/api');
        blockUrl.searchParams.set('chainid', '1');
        blockUrl.searchParams.set('module', 'proxy');
        blockUrl.searchParams.set('action', 'eth_getBlockByNumber');
        blockUrl.searchParams.set('tag', blockHex);
        blockUrl.searchParams.set('boolean', 'false');
        blockUrl.searchParams.set('apikey', etherscanApiKey);

        const blockRes = await fetch(blockUrl.toString());
        const blockData = await blockRes.json();

        if (blockData.result?.timestamp) {
          const timestamp = parseInt(blockData.result.timestamp, 16);
          const settledAt = new Date(timestamp * 1000).toISOString();

          await sql`
            UPDATE legacy_nouns SET settled_at = ${settledAt} WHERE id = ${id}
          `;
          fixedTimestamps++;
        }
      }

      // Rate limit Etherscan (5 req/s on free tier, 2 calls per noun)
      await new Promise(r => setTimeout(r, 500));

      if ((i + 1) % 10 === 0) {
        console.log(`  Timestamps: ${i + 1}/${badTimestamps.length} checked (${fixedTimestamps} fixed)`);
      }
    } catch (error) {
      console.error(`  Error fixing timestamp for noun ${id}:`, error);
    }
  }

  console.log(`\n── Backfill complete ──`);
  console.log(`  Winning bids fixed: ${fixedBids}`);
  console.log(`  Winner addresses fixed: ${fixedWinners}`);
  console.log(`  Timestamps fixed: ${fixedTimestamps}`);
}

main().catch((err) => {
  console.error('Backfill failed:', err);
  process.exit(1);
});
