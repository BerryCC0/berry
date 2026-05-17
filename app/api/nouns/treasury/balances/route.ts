/**
 * GET /api/nouns/treasury/balances
 *
 * Server-side treasury valuation using Alchemy.
 *
 * Three calls per treasury address:
 *   1. eth_getBalance for native ETH
 *   2. alchemy_getTokenBalances ('erc20') for all ERC-20 holdings
 *   3. alchemy_getTokenMetadata batched for symbol/decimals/name
 * Then one batched Alchemy Prices API call for USD per token.
 *
 * This intentionally replaces the on-chain useReadContracts approach so that
 * appreciating LSTs (wstETH, rETH, mETH) are valued at their real USD price
 * rather than 1:1 with ETH — matching what Etherscan's portfolio view shows.
 *
 * Dust filter: token positions worth less than DUST_USD are dropped before
 * sums so the display isn't polluted by airdrop spam.
 */

import { NextResponse } from 'next/server';
import { formatUnits } from 'viem';
import { NOUNS_ADDRESSES } from '@/app/lib/nouns/contracts';

const DUST_USD = 100; // hide positions worth less than $100
const WETH = '0xc02aaa39b223fe8d0a0e5c4f27ead9083c756cc2';
const USDC = '0xa0b86991c6218b36c1d19d4a2e9eb0ce3606eb48';
const USDT = '0xdac17f958d2ee523a2206206994597c13d831ec7';
const DAI = '0x6b175474e89094c44da98b954eedeac495271d0f';

type Category = 'native' | 'eth_derivative' | 'stablecoin' | 'token';

// Hand-curated categorization. Everything else falls into 'token'.
const CATEGORY_MAP: Record<string, Category> = {
  '0x7f39c581f595b53c5cb19bd0b3f8da6c935e2ca0': 'eth_derivative', // wstETH
  '0xae7ab96520de3a18e5e111b5eaab095312d7fe84': 'eth_derivative', // stETH
  '0xae78736cd615f374d3085123a210448e74fc6393': 'eth_derivative', // rETH
  '0xd5f7838f5c461feff7fe49ea5ebaf7728bb0adfa': 'eth_derivative', // mETH
  [WETH]: 'eth_derivative',
  [USDC]: 'stablecoin',
  [USDT]: 'stablecoin',
  [DAI]: 'stablecoin',
};

export interface TreasuryTokenBalance {
  address: string;
  symbol: string;
  name: string;
  decimals: number;
  rawBalance: string;
  formattedBalance: string;
  priceUsd: number | null;
  valueUsd: number;
  category: Category;
}

export interface TreasurySnapshot {
  address: string;
  nativeEth: {
    rawWei: string;
    formatted: string;
    valueUsd: number;
  };
  tokens: TreasuryTokenBalance[];
  totalUsd: number;
}

export interface TreasuryBalancesResponse {
  ethPriceUsd: number;
  fetchedAt: string;
  v2: TreasurySnapshot;
  v1: TreasurySnapshot;
  combined: {
    totalUsd: number;
    nativeEthValueUsd: number;
    /** Native ETH + WETH + stablecoins — assets usable for spending now. */
    immediatelySpendableUsd: number;
    /** wstETH + stETH + rETH + mETH (LSTs, excluding WETH). */
    stakedEthDerivativesUsd: number;
    /** Any other ERC-20s above the dust filter (ENS, etc). */
    otherTokensUsd: number;
  };
  /** Tokens we couldn't price — useful for debugging missing coverage. */
  unpricedTokens: Array<{ address: string; symbol: string; rawBalance: string }>;
}

function alchemyUrl(): string {
  const key = process.env.ALCHEMY_API_KEY;
  if (!key) throw new Error('ALCHEMY_API_KEY not set');
  return `https://eth-mainnet.g.alchemy.com/v2/${key}`;
}

function pricesUrl(): string {
  const key = process.env.ALCHEMY_API_KEY;
  if (!key) throw new Error('ALCHEMY_API_KEY not set');
  return `https://api.g.alchemy.com/prices/v1/${key}/tokens/by-address`;
}

interface AlchemyTokenBalance {
  contractAddress: string;
  tokenBalance: string | null;
  error?: string | null;
}

interface AlchemyTokenMetadata {
  decimals: number | null;
  logo: string | null;
  name: string | null;
  symbol: string | null;
}

async function rpc<T>(method: string, params: unknown[]): Promise<T> {
  const res = await fetch(alchemyUrl(), {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ jsonrpc: '2.0', id: 1, method, params }),
  });
  const json = await res.json();
  if (json.error) throw new Error(`${method} failed: ${json.error.message}`);
  return json.result as T;
}

async function fetchTokenBalances(address: string): Promise<AlchemyTokenBalance[]> {
  const result = await rpc<{ tokenBalances: AlchemyTokenBalance[] }>(
    'alchemy_getTokenBalances',
    [address, 'erc20'],
  );
  return result.tokenBalances.filter((b) => {
    if (!b.tokenBalance) return false;
    return BigInt(b.tokenBalance) > BigInt(0);
  });
}

async function fetchTokenMetadata(address: string): Promise<AlchemyTokenMetadata> {
  return rpc<AlchemyTokenMetadata>('alchemy_getTokenMetadata', [address]);
}

async function fetchEthBalance(address: string): Promise<bigint> {
  const hex = await rpc<string>('eth_getBalance', [address, 'latest']);
  return BigInt(hex);
}

const PRICES_BATCH_LIMIT = 25; // Alchemy Prices API hard limit

async function fetchPricesUsd(addresses: string[]): Promise<Map<string, number>> {
  const map = new Map<string, number>();
  if (addresses.length === 0) return map;

  const batches: string[][] = [];
  for (let i = 0; i < addresses.length; i += PRICES_BATCH_LIMIT) {
    batches.push(addresses.slice(i, i + PRICES_BATCH_LIMIT));
  }

  const results = await Promise.all(
    batches.map(async (batch) => {
      const res = await fetch(pricesUrl(), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          addresses: batch.map((a) => ({ network: 'eth-mainnet', address: a })),
        }),
      });
      if (!res.ok) {
        console.error('[prices] batch failed:', res.status, await res.text());
        return null;
      }
      return (await res.json()) as {
        data?: Array<{
          address?: string;
          prices?: Array<{ currency: string; value: string }>;
        }>;
      };
    }),
  );

  for (const json of results) {
    for (const entry of json?.data ?? []) {
      if (!entry.address || !entry.prices) continue;
      const usd = entry.prices.find((p) => p.currency === 'usd');
      if (!usd) continue;
      const value = parseFloat(usd.value);
      if (Number.isFinite(value)) {
        map.set(entry.address.toLowerCase(), value);
      }
    }
  }
  return map;
}

interface ResolvedToken {
  address: string;
  symbol: string;
  name: string;
  decimals: number;
  rawBalance: bigint;
}

async function resolveTokens(rawBalances: AlchemyTokenBalance[]): Promise<ResolvedToken[]> {
  const metaResults = await Promise.all(
    rawBalances.map((b) =>
      fetchTokenMetadata(b.contractAddress).catch(() => null),
    ),
  );

  const resolved: ResolvedToken[] = [];
  for (let i = 0; i < rawBalances.length; i += 1) {
    const balance = rawBalances[i];
    const meta = metaResults[i];
    if (!balance.tokenBalance) continue;
    const decimals = meta?.decimals ?? 18;
    resolved.push({
      address: balance.contractAddress.toLowerCase(),
      symbol: (meta?.symbol ?? 'UNKNOWN').slice(0, 24),
      name: (meta?.name ?? 'Unknown Token').slice(0, 64),
      decimals,
      rawBalance: BigInt(balance.tokenBalance),
    });
  }
  return resolved;
}

function categorize(address: string): Category {
  return CATEGORY_MAP[address] ?? 'token';
}

function dedupeByAddress<T extends { address: string }>(items: T[]): T[] {
  const seen = new Set<string>();
  const out: T[] = [];
  for (const item of items) {
    if (seen.has(item.address)) continue;
    seen.add(item.address);
    out.push(item);
  }
  return out;
}

async function snapshot(address: string, ethPriceUsd: number): Promise<{
  snapshot: TreasurySnapshot;
  unpriced: Array<{ address: string; symbol: string; rawBalance: string }>;
}> {
  const [ethWei, rawTokens] = await Promise.all([
    fetchEthBalance(address),
    fetchTokenBalances(address),
  ]);

  const tokens = await resolveTokens(rawTokens);
  const prices = await fetchPricesUsd(tokens.map((t) => t.address));

  const priced: TreasuryTokenBalance[] = [];
  const unpriced: Array<{ address: string; symbol: string; rawBalance: string }> = [];

  for (const t of tokens) {
    const priceUsd = prices.get(t.address) ?? null;
    const formattedBalance = formatUnits(t.rawBalance, t.decimals);
    const valueUsd = priceUsd === null ? 0 : parseFloat(formattedBalance) * priceUsd;
    if (priceUsd === null) {
      unpriced.push({
        address: t.address,
        symbol: t.symbol,
        rawBalance: t.rawBalance.toString(),
      });
      continue;
    }
    if (valueUsd < DUST_USD) continue;
    priced.push({
      address: t.address,
      symbol: t.symbol,
      name: t.name,
      decimals: t.decimals,
      rawBalance: t.rawBalance.toString(),
      formattedBalance,
      priceUsd,
      valueUsd,
      category: categorize(t.address),
    });
  }

  priced.sort((a, b) => b.valueUsd - a.valueUsd);

  const nativeEthFormatted = formatUnits(ethWei, 18);
  const nativeEthValueUsd = parseFloat(nativeEthFormatted) * ethPriceUsd;
  const totalUsd =
    nativeEthValueUsd + priced.reduce((sum, t) => sum + t.valueUsd, 0);

  return {
    snapshot: {
      address: address.toLowerCase(),
      nativeEth: {
        rawWei: ethWei.toString(),
        formatted: nativeEthFormatted,
        valueUsd: nativeEthValueUsd,
      },
      tokens: priced,
      totalUsd,
    },
    unpriced,
  };
}

export async function GET() {
  try {
    // Fetch ETH price first (we need it for native ETH valuation)
    const ethPriceMap = await fetchPricesUsd([WETH]);
    const ethPriceUsd = ethPriceMap.get(WETH) ?? 0;
    if (ethPriceUsd === 0) {
      throw new Error('Failed to fetch ETH price');
    }

    const [v2Result, v1Result] = await Promise.all([
      snapshot(NOUNS_ADDRESSES.treasury, ethPriceUsd),
      snapshot(NOUNS_ADDRESSES.treasuryV1, ethPriceUsd),
    ]);

    const allSnaps = [v2Result.snapshot, v1Result.snapshot];

    let nativeEthValueUsd = 0;
    let immediatelySpendableUsd = 0;
    let stakedEthDerivativesUsd = 0;
    let otherTokensUsd = 0;

    for (const snap of allSnaps) {
      nativeEthValueUsd += snap.nativeEth.valueUsd;
      immediatelySpendableUsd += snap.nativeEth.valueUsd;
      for (const t of snap.tokens) {
        if (t.category === 'stablecoin') {
          immediatelySpendableUsd += t.valueUsd;
        } else if (t.address === WETH) {
          // WETH is spendable, not "staked"
          immediatelySpendableUsd += t.valueUsd;
        } else if (t.category === 'eth_derivative') {
          stakedEthDerivativesUsd += t.valueUsd;
        } else {
          otherTokensUsd += t.valueUsd;
        }
      }
    }

    const response: TreasuryBalancesResponse = {
      ethPriceUsd,
      fetchedAt: new Date().toISOString(),
      v2: v2Result.snapshot,
      v1: v1Result.snapshot,
      combined: {
        totalUsd: allSnaps.reduce((sum, s) => sum + s.totalUsd, 0),
        nativeEthValueUsd,
        immediatelySpendableUsd,
        stakedEthDerivativesUsd,
        otherTokensUsd,
      },
      unpricedTokens: dedupeByAddress([
        ...v2Result.unpriced,
        ...v1Result.unpriced,
      ]),
    };

    return NextResponse.json(response);
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    console.error('[API] treasury/balances failed:', message);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

