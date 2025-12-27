/**
 * Sync Nouns Script
 * Fetches all settled auctions from Goldsky and populates the nouns table
 * Uses Etherscan to find who settled each auction (called settleCurrentAndCreateNewAuction)
 * 
 * Usage: npx tsx scripts/sync-nouns.ts
 */

import { neon } from '@neondatabase/serverless';
import { config } from 'dotenv';

// Load .env.local first, then .env
config({ path: '.env.local' });
config({ path: '.env' });

const GOLDSKY_ENDPOINT = 'https://api.goldsky.com/api/public/project_cldf2o9pqagp43svvbk5u3kmo/subgraphs/nouns/prod/gn';
const AUCTION_HOUSE_ADDRESS = '0x830BD73E4184ceF73443C15111a1DF14e495C706';

// AuctionSettled event signature: AuctionSettled(uint256 indexed nounId, address winner, uint256 amount)
const AUCTION_SETTLED_TOPIC = '0xc9f72b276a388619c6d185d146697036241880c36654b1a3ffdad07c24038d99';

// Import image data and SVG builder
import { ImageData } from '../app/lib/nouns/utils/image-data';
import { buildSVG } from '../app/lib/nouns/utils/svg-builder';

interface NounSeed {
  background: number;
  body: number;
  accessory: number;
  head: number;
  glasses: number;
}

interface AuctionData {
  id: string;
  noun: {
    id: string;
    seed: {
      background: string;
      body: string;
      accessory: string;
      head: string;
      glasses: string;
    };
    owner: {
      id: string;
    };
  };
  amount: string;
  bidder: {
    id: string;
  } | null;
  settled: boolean;
  endTime: string;
  startTime: string;
}

interface EtherscanLogResult {
  blockNumber: string;
  timeStamp: string;
  transactionHash: string;
  topics: string[];
  data: string;
}

interface EtherscanTxResult {
  hash: string;
  from: string;
  blockNumber: string;
  timeStamp: string;
}

interface SettlementInfo {
  nounId: number;
  txHash: string;
  settlerAddress: string;
  timestamp: number;
}

const AUCTIONS_QUERY = `
  query GetAuctions($first: Int!, $skip: Int!) {
    auctions(
      first: $first
      skip: $skip
      orderBy: startTime
      orderDirection: desc
      where: { settled: true }
    ) {
      id
      noun {
        id
        seed {
          background
          body
          accessory
          head
          glasses
        }
        owner {
          id
        }
      }
      amount
      bidder {
        id
      }
      settled
      endTime
      startTime
    }
  }
`;

// All nouns query - includes Nounder nouns that weren't auctioned
const ALL_NOUNS_QUERY = `
  query GetAllNouns($first: Int!, $skip: Int!) {
    nouns(
      first: $first
      skip: $skip
      orderBy: id
      orderDirection: asc
    ) {
      id
      seed {
        background
        body
        accessory
        head
        glasses
      }
      owner {
        id
      }
    }
  }
`;

interface NounData {
  id: string;
  seed: {
    background: string;
    body: string;
    accessory: string;
    head: string;
    glasses: string;
  };
  owner: {
    id: string;
  };
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

async function queryGoldsky<T>(query: string, variables: Record<string, unknown>): Promise<T> {
  const response = await fetch(GOLDSKY_ENDPOINT, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ query, variables }),
  });
  
  const json = await response.json();
  if (json.errors) {
    throw new Error(`GraphQL error: ${json.errors[0].message}`);
  }
  return json.data;
}

async function fetchAllAuctions(): Promise<AuctionData[]> {
  const allAuctions: AuctionData[] = [];
  let skip = 0;
  const first = 1000;
  
  console.log('Fetching settled auctions from Goldsky...');
  
  while (true) {
    const data = await queryGoldsky<{ auctions: AuctionData[] }>(AUCTIONS_QUERY, { first, skip });
    
    if (data.auctions.length === 0) break;
    
    allAuctions.push(...data.auctions);
    console.log(`  Fetched ${allAuctions.length} auctions...`);
    
    if (data.auctions.length < first) break;
    skip += first;
  }
  
  return allAuctions;
}

async function fetchAllNouns(): Promise<NounData[]> {
  const allNouns: NounData[] = [];
  let skip = 0;
  const first = 1000;
  
  console.log('Fetching all nouns from Goldsky...');
  
  while (true) {
    const data = await queryGoldsky<{ nouns: NounData[] }>(ALL_NOUNS_QUERY, { first, skip });
    
    if (data.nouns.length === 0) break;
    
    allNouns.push(...data.nouns);
    console.log(`  Fetched ${allNouns.length} nouns...`);
    
    if (data.nouns.length < first) break;
    skip += first;
  }
  
  return allNouns;
}

// Nounder nouns are every 10th noun for the first 5 years (IDs 0, 10, 20, ... up to ~1820)
// They are minted directly to Nounders and not auctioned
function isNounderNoun(nounId: number): boolean {
  // Every 10th noun during the first 5 years goes to Nounders
  // After noun 1820, this stops
  return nounId <= 1820 && nounId % 10 === 0;
}

async function fetchSettlementEventsFromEtherscan(apiKey: string): Promise<Map<number, SettlementInfo>> {
  console.log('Fetching AuctionSettled events from Etherscan V2 API...');
  
  const settlementMap = new Map<number, SettlementInfo>();
  let page = 1;
  const pageSize = 1000;
  
  while (true) {
    // Fetch AuctionSettled event logs using V2 API
    // Ref: https://docs.etherscan.io/api-reference/endpoint/getlogs-address-topics
    const url = new URL('https://api.etherscan.io/v2/api');
    url.searchParams.set('chainid', '1');
    url.searchParams.set('module', 'logs');
    url.searchParams.set('action', 'getLogs');
    url.searchParams.set('address', AUCTION_HOUSE_ADDRESS);
    url.searchParams.set('topic0', AUCTION_SETTLED_TOPIC);
    url.searchParams.set('fromBlock', '0');
    url.searchParams.set('toBlock', 'latest');
    url.searchParams.set('page', String(page));
    url.searchParams.set('offset', String(pageSize));
    url.searchParams.set('apikey', apiKey);
    
    const response = await fetch(url.toString());
    const data = await response.json();
    
    if (data.status !== '1' || !data.result || data.result.length === 0) {
      if (data.message === 'No records found') break;
      if (page === 1) {
        console.error('Etherscan API error:', data.message);
        break;
      }
      break;
    }
    
    const logs: EtherscanLogResult[] = data.result;
    
    // For each log, we need to get the transaction to find who called settleCurrentAndCreateNewAuction
    // The nounId is in topics[1] (indexed parameter)
    for (const log of logs) {
      const nounId = parseInt(log.topics[1], 16);
      
      // We'll batch the transaction lookups after collecting all logs
      settlementMap.set(nounId, {
        nounId,
        txHash: log.transactionHash,
        settlerAddress: '', // Will fill in later
        timestamp: parseInt(log.timeStamp, 16),
      });
    }
    
    console.log(`  Fetched ${settlementMap.size} settlement events (page ${page})...`);
    
    if (logs.length < pageSize) break;
    page++;
    
    // Rate limit: Etherscan free tier is 5 calls/sec
    await new Promise(resolve => setTimeout(resolve, 250));
  }
  
  // Now fetch transaction details to get the sender (settler)
  console.log('Fetching transaction senders from Etherscan...');
  
  const entries = Array.from(settlementMap.entries());
  const batchSize = 20; // Process in batches to respect rate limits
  
  for (let i = 0; i < entries.length; i += batchSize) {
    const batch = entries.slice(i, i + batchSize);
    
    await Promise.all(batch.map(async ([nounId, info]) => {
      try {
        // Use V2 API for transaction lookup
        const url = new URL('https://api.etherscan.io/v2/api');
        url.searchParams.set('chainid', '1');
        url.searchParams.set('module', 'proxy');
        url.searchParams.set('action', 'eth_getTransactionByHash');
        url.searchParams.set('txhash', info.txHash);
        url.searchParams.set('apikey', apiKey);
        
        const response = await fetch(url.toString());
        const data = await response.json();
        
        if (data.result && data.result.from) {
          info.settlerAddress = data.result.from.toLowerCase();
        }
      } catch (error) {
        console.error(`Error fetching tx ${info.txHash}:`, error);
      }
    }));
    
    if (i + batchSize < entries.length) {
      console.log(`  Processed ${Math.min(i + batchSize, entries.length)}/${entries.length} transactions...`);
      // Rate limit
      await new Promise(resolve => setTimeout(resolve, 1000));
    }
  }
  
  return settlementMap;
}

async function resolveENS(address: string, apiKey: string): Promise<string | null> {
  // Use Etherscan's ENS lookup (or skip for now to speed up)
  // This could be enhanced with a proper ENS resolution service
  return null;
}

async function syncNouns() {
  if (!process.env.DATABASE_URL) {
    console.error('DATABASE_URL environment variable is not set');
    process.exit(1);
  }
  
  if (!process.env.ETHERSCAN_API_KEY) {
    console.error('ETHERSCAN_API_KEY environment variable is not set');
    process.exit(1);
  }
  
  const sql = neon(process.env.DATABASE_URL);
  const etherscanApiKey = process.env.ETHERSCAN_API_KEY;
  
  // Check existing nouns
  const existingResult = await sql`SELECT id FROM nouns ORDER BY id DESC LIMIT 1`;
  const highestExisting = existingResult[0]?.id ?? -1;
  console.log(`Highest existing noun in database: ${highestExisting}`);
  
  // Fetch all nouns (includes Nounder nouns)
  const allNouns = await fetchAllNouns();
  console.log(`Found ${allNouns.length} total nouns`);
  
  // Fetch all settled auctions from Goldsky
  const auctions = await fetchAllAuctions();
  console.log(`Found ${auctions.length} settled auctions`);
  
  // Create auction lookup map
  const auctionMap = new Map<number, AuctionData>();
  for (const auction of auctions) {
    auctionMap.set(parseInt(auction.noun.id), auction);
  }
  
  // Fetch settlement events from Etherscan
  const settlementEvents = await fetchSettlementEventsFromEtherscan(etherscanApiKey);
  console.log(`Found ${settlementEvents.size} settlement events with settler info`);
  
  // Process and insert nouns
  let inserted = 0;
  let skipped = 0;
  let errors = 0;
  let nounderCount = 0;
  
  for (const noun of allNouns) {
    const nounId = parseInt(noun.id);
    
    // Check if already exists
    const existing = await sql`SELECT id FROM nouns WHERE id = ${nounId}`;
    if (existing.length > 0) {
      skipped++;
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
      
      // Render SVG
      const svg = renderNounSVG(seed);
      
      // Check if this is a Nounder noun (not auctioned)
      const isNounder = isNounderNoun(nounId);
      const auction = auctionMap.get(nounId);
      
      let settledAt: string;
      let settledByAddress: string;
      let settledTxHash: string;
      let winnerAddress: string | null;
      let winningBid: string | null;
      
      if (isNounder && !auction) {
        // Nounder noun - minted directly, not auctioned
        nounderCount++;
        settledAt = new Date(0).toISOString(); // Genesis
        settledByAddress = '0x2573C60a6D127755aA2DC85e342F7da2378a0Cc5'; // Nounders multisig
        settledTxHash = '0x0000000000000000000000000000000000000000000000000000000000000000';
        winnerAddress = '0x2573C60a6D127755aA2DC85e342F7da2378a0Cc5'; // Nounders
        winningBid = null; // No auction
      } else if (auction) {
        // Regular auctioned noun
        const settlement = settlementEvents.get(nounId);
        settledAt = settlement 
          ? new Date(settlement.timestamp * 1000).toISOString()
          : new Date(parseInt(auction.endTime) * 1000).toISOString();
        settledByAddress = settlement?.settlerAddress || '0x0000000000000000000000000000000000000000';
        settledTxHash = settlement?.txHash || '0x0000000000000000000000000000000000000000000000000000000000000000';
        winnerAddress = auction.bidder?.id || null;
        winningBid = auction.amount !== '0' ? auction.amount : null;
      } else {
        // Edge case - noun exists but no auction data
        console.warn(`Noun ${nounId} has no auction data and is not a Nounder noun`);
        settledAt = new Date().toISOString();
        settledByAddress = '0x0000000000000000000000000000000000000000';
        settledTxHash = '0x0000000000000000000000000000000000000000000000000000000000000000';
        winnerAddress = noun.owner.id;
        winningBid = null;
      }
      
      // Insert
      await sql`
        INSERT INTO nouns (
          id, background, body, accessory, head, glasses, svg,
          settled_by_address, settled_at, settled_tx_hash,
          winning_bid, winner_address
        ) VALUES (
          ${nounId},
          ${seed.background},
          ${seed.body},
          ${seed.accessory},
          ${seed.head},
          ${seed.glasses},
          ${svg},
          ${settledByAddress},
          ${settledAt},
          ${settledTxHash},
          ${winningBid},
          ${winnerAddress}
        )
        ON CONFLICT (id) DO NOTHING
      `;
      
      inserted++;
      if (inserted % 50 === 0) {
        console.log(`  Inserted ${inserted} nouns...`);
      }
    } catch (error) {
      console.error(`Error inserting noun ${nounId}:`, error);
      errors++;
    }
  }
  
  console.log('\n=== Sync Complete ===');
  console.log(`Inserted: ${inserted} (including ${nounderCount} Nounder nouns)`);
  console.log(`Skipped (already exists): ${skipped}`);
  console.log(`Errors: ${errors}`);
  
  // Final count
  const countResult = await sql`SELECT COUNT(*) as count FROM nouns`;
  console.log(`Total nouns in database: ${countResult[0]?.count}`);
}

// Run
syncNouns().catch(console.error);
