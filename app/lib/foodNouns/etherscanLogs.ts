/**
 * Server-only helper for fetching event logs via the Etherscan V2 API.
 * Used by Food Nouns API routes — public RPCs choke on the multi-million
 * block range these queries need.
 */

import 'server-only';

export interface RawEtherscanLog {
  address: string;
  topics: `0x${string}`[];
  data: `0x${string}`;
  blockNumber: `0x${string}`;
  transactionHash: `0x${string}`;
  logIndex: `0x${string}`;
  timeStamp: `0x${string}`;
}

interface FetchArgs {
  address: `0x${string}`;
  topic0: `0x${string}`;
  fromBlock?: number;
  /** Cap on total logs; we abort with an error past this. Defaults to 5000. */
  maxLogs?: number;
}

const ETHERSCAN_BASE = 'https://api.etherscan.io/v2/api';
const FN_DEFAULT_FROM_BLOCK = 15_000_000;
const PAGE_SIZE = 1000;

export async function fetchEtherscanLogs({
  address,
  topic0,
  fromBlock = FN_DEFAULT_FROM_BLOCK,
  maxLogs = 5000,
}: FetchArgs): Promise<RawEtherscanLog[]> {
  const apiKey = process.env.ETHERSCAN_API_KEY;
  if (!apiKey) {
    throw new Error('ETHERSCAN_API_KEY is not configured');
  }

  const all: RawEtherscanLog[] = [];
  let page = 1;

  while (all.length < maxLogs) {
    const url = new URL(ETHERSCAN_BASE);
    url.searchParams.set('chainid', '1');
    url.searchParams.set('module', 'logs');
    url.searchParams.set('action', 'getLogs');
    url.searchParams.set('address', address);
    url.searchParams.set('fromBlock', String(fromBlock));
    url.searchParams.set('toBlock', 'latest');
    url.searchParams.set('topic0', topic0);
    url.searchParams.set('page', String(page));
    url.searchParams.set('offset', String(PAGE_SIZE));
    url.searchParams.set('apikey', apiKey);

    const res = await fetch(url, { next: { revalidate: 30 } });
    if (!res.ok) {
      throw new Error(`Etherscan logs request failed: ${res.status}`);
    }
    const json = (await res.json()) as { status: string; message: string; result: unknown };

    // Etherscan returns status:"0" with message:"No records found" for empty results.
    if (json.status !== '1') {
      if (typeof json.result === 'string' && /no records/i.test(json.result)) break;
      if (Array.isArray(json.result) && json.result.length === 0) break;
      // Some empty responses just return an empty array with status 0.
      if (json.message && /no records/i.test(json.message)) break;
      throw new Error(`Etherscan logs error: ${json.message ?? 'unknown'}`);
    }

    const batch = (json.result ?? []) as RawEtherscanLog[];
    all.push(...batch);
    if (batch.length < PAGE_SIZE) break;
    page += 1;
    if (page > Math.ceil(maxLogs / PAGE_SIZE)) break;
  }

  return all;
}
