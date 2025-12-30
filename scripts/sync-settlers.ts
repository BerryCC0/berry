/**
 * Sync Settlers Script
 * Updates settler info for nouns that are missing it
 * Respects Etherscan rate limits (5 calls/sec max)
 * 
 * Usage: npx tsx scripts/sync-settlers.ts
 */

import { neon } from '@neondatabase/serverless';
import { config } from 'dotenv';

// Load .env.local first, then .env
config({ path: '.env.local' });
config({ path: '.env' });

const AUCTION_HOUSE_ADDRESS = '0x830BD73E4184ceF73443C15111a1DF14e495C706';
const AUCTION_SETTLED_TOPIC = '0xc9f72b276a388619c6d185d146697036241880c36654b1a3ffdad07c24038d99';

// Nounder nouns are every 10th noun for the first 5 years
function isNounderNoun(nounId: number): boolean {
  return nounId <= 1820 && nounId % 10 === 0;
}

async function delay(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

async function syncSettlers() {
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
  
  // Get nouns missing settler info (excluding genesis nouns 0 and 1)
  console.log('Finding nouns missing settler info...');
  const missingSettlers = await sql`
    SELECT id FROM nouns 
    WHERE settled_by_address = '0x0000000000000000000000000000000000000000'
    AND id > 1
    ORDER BY id ASC
  `;
  
  console.log(`Found ${missingSettlers.length} nouns missing settler info`);
  
  if (missingSettlers.length === 0) {
    console.log('All nouns have settler info!');
    return;
  }
  
  let updated = 0;
  let errors = 0;
  
  for (const { id: nounId } of missingSettlers) {
    try {
      // Determine which auction was settled to create this noun
      // If this is a Nounder noun (N % 10 === 0), settler settled N-1's auction
      // If previous noun was a Nounder, settler settled N-2's auction
      let settledNounId: number;
      
      if (isNounderNoun(nounId)) {
        // This is a Nounder noun, settler settled the previous auctioned noun's auction
        settledNounId = nounId - 1;
      } else if (isNounderNoun(nounId - 1)) {
        // Previous noun was a Nounder, so settler settled two nouns ago
        settledNounId = nounId - 2;
      } else {
        // Normal case: settler settled the previous noun's auction
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
      
      // Rate limit: wait 250ms (4 calls/sec to stay under limit)
      await delay(250);
      
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
        
        // Rate limit again
        await delay(250);
        
        if (txData.result?.from) {
          // The timeStamp from Etherscan logs is in decimal (seconds since epoch)
          const timestamp = parseInt(log.timeStamp, 10);
          
          await sql`
            UPDATE nouns 
            SET settled_by_address = ${txData.result.from.toLowerCase()},
                settled_tx_hash = ${log.transactionHash},
                settled_at = ${new Date(timestamp * 1000).toISOString()}
            WHERE id = ${nounId}
          `;
          
          updated++;
          
          // If this noun is a Nounder and the next noun also doesn't have settler info,
          // update the next noun too (same settler)
          if (isNounderNoun(nounId)) {
            const nextNounId = nounId + 1;
            await sql`
              UPDATE nouns 
              SET settled_by_address = ${txData.result.from.toLowerCase()},
                  settled_tx_hash = ${log.transactionHash},
                  settled_at = ${new Date(timestamp * 1000).toISOString()}
              WHERE id = ${nextNounId}
              AND settled_by_address = '0x0000000000000000000000000000000000000000'
            `;
          }
          
          if (updated % 50 === 0) {
            console.log(`Updated ${updated}/${missingSettlers.length} nouns with settler info...`);
          }
        } else {
          console.log(`  Noun ${nounId}: Could not get tx sender`);
          errors++;
        }
      } else {
        console.log(`  Noun ${nounId}: No AuctionSettled event found for auction ${settledNounId}`);
        errors++;
      }
    } catch (error) {
      console.error(`Error updating settler for noun ${nounId}:`, error);
      errors++;
    }
  }
  
  console.log('\n=== Settler Sync Complete ===');
  console.log(`Updated: ${updated}`);
  console.log(`Errors/Not Found: ${errors}`);
  
  // Show count of remaining missing
  const stillMissing = await sql`
    SELECT COUNT(*) as count FROM nouns 
    WHERE settled_by_address = '0x0000000000000000000000000000000000000000'
    AND id > 1
  `;
  console.log(`Still missing settler: ${stillMissing[0]?.count}`);
  
  // Show some samples
  console.log('\nSample updated nouns:');
  const samples = await sql`
    SELECT id, settled_by_address 
    FROM nouns 
    WHERE id IN (10, 100, 500, 1000, 1500, 1760)
    ORDER BY id
  `;
  for (const s of samples) {
    const settler = s.settled_by_address === '0x0000000000000000000000000000000000000000'
      ? '(none)'
      : `${s.settled_by_address.slice(0, 10)}...`;
    console.log(`  Noun ${s.id}: ${settler}`);
  }
}

// Run
syncSettlers().catch(console.error);
