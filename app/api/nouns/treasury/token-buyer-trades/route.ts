/**
 * GET /api/nouns/treasury/token-buyer-trades
 *
 * ETH-out / USDC-in trades executed by the TokenBuyer contract. Buyers swap
 * USDC into the Payer contract and receive ETH from the TokenBuyer; tracked
 * for treasury accounting of "ETH converted to USDC for payments".
 */

import { NextResponse } from 'next/server';
import { ponderSql } from '@/app/lib/ponder-db';

const ROW_LIMIT = 200;

export interface TokenBuyerTradeRow {
  id: string;
  to: string;
  toEns: string | null;
  ethOutWei: string;
  /** USDC has 6 decimals — raw amount, client formats. */
  tokenInRaw: string;
  blockTimestamp: string;
  txHash: string;
}

export interface TokenBuyerTradesResponse {
  totals: {
    tradeCount: number;
    totalEthOutWei: string;
    totalTokenInRaw: string;
  };
  last30d: {
    tradeCount: number;
    totalEthOutWei: string;
    totalTokenInRaw: string;
  };
  trades: TokenBuyerTradeRow[];
}

export async function GET() {
  try {
    const sql = ponderSql();

    const [totalsRows, last30dRows, tradeRows] = await Promise.all([
      sql`
        SELECT COUNT(*)::INT AS trade_count,
               COALESCE(SUM(eth_out), 0)::TEXT AS total_eth_out_wei,
               COALESCE(SUM(token_in), 0)::TEXT AS total_token_in_raw
        FROM ponder_live.token_buyer_trades
      `,
      sql`
        WITH cutoff AS (SELECT EXTRACT(EPOCH FROM (NOW() - INTERVAL '30 days'))::BIGINT AS ts)
        SELECT COUNT(*)::INT AS trade_count,
               COALESCE(SUM(t.eth_out), 0)::TEXT AS total_eth_out_wei,
               COALESCE(SUM(t.token_in), 0)::TEXT AS total_token_in_raw
        FROM ponder_live.token_buyer_trades t, cutoff
        WHERE t.block_timestamp >= cutoff.ts
      `,
      sql`
        SELECT t.id, t."to" AS to_addr, t.eth_out::TEXT AS eth_out, t.token_in::TEXT AS token_in,
               t.block_timestamp::TEXT AS block_timestamp, t.tx_hash,
               e.name AS to_ens
        FROM ponder_live.token_buyer_trades t
        LEFT JOIN ponder_live.ens_names e ON e.address = t."to"
        ORDER BY t.block_timestamp DESC
        LIMIT ${ROW_LIMIT}
      `,
    ]);

    const totals = totalsRows[0] ?? {};
    const last30d = last30dRows[0] ?? {};

    const trades: TokenBuyerTradeRow[] = tradeRows.map((r) => ({
      id: String(r.id),
      to: String(r.to_addr).toLowerCase(),
      toEns: r.to_ens ? String(r.to_ens) : null,
      ethOutWei: String(r.eth_out),
      tokenInRaw: String(r.token_in),
      blockTimestamp: String(r.block_timestamp),
      txHash: String(r.tx_hash),
    }));

    const response: TokenBuyerTradesResponse = {
      totals: {
        tradeCount: Number(totals.trade_count ?? 0),
        totalEthOutWei: String(totals.total_eth_out_wei ?? '0'),
        totalTokenInRaw: String(totals.total_token_in_raw ?? '0'),
      },
      last30d: {
        tradeCount: Number(last30d.trade_count ?? 0),
        totalEthOutWei: String(last30d.total_eth_out_wei ?? '0'),
        totalTokenInRaw: String(last30d.total_token_in_raw ?? '0'),
      },
      trades,
    };

    return NextResponse.json(response);
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    console.error('[API] treasury/token-buyer-trades failed:', message);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
