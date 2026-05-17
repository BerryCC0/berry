/**
 * GET /api/nouns/treasury/streams
 *
 * All payment streams created via the Nouns DAO StreamFactory.
 * Each row includes:
 *   - Recipient (with optional ENS)
 *   - Token (address — caller decodes USDC vs WETH client-side)
 *   - Total amount + start/stop timestamps
 *   - Vested-to-now ratio (computed in SQL so the client doesn't have to)
 *   - Stream contract address
 */

import { NextResponse } from 'next/server';
import { erc20Abi } from 'viem';
import { ponderSql } from '@/app/lib/ponder-db';
import { getMainnetClient } from '@/app/lib/rpc';

export interface StreamRow {
  id: string;
  recipient: string;
  recipientEns: string | null;
  payer: string;
  tokenAddress: string;
  tokenAmountRaw: string;
  startTime: string;
  stopTime: string;
  streamAddress: string;
  blockTimestamp: string;
  /** Server-computed: 0..1 fraction of stream elapsed (clamped). */
  vestedRatio: number;
  /**
   * Token amount the recipient has already withdrawn from the stream contract.
   * Derived as `tokenAmount - tokenContract.balanceOf(streamAddress)` via
   * multicall, so it reflects actual on-chain claims rather than vesting time.
   * `null` if the on-chain read failed for this stream.
   */
  claimedRaw: string | null;
  /** Server-computed: 0..1 fraction of total stream amount claimed. `null` if claimedRaw is null. */
  claimedRatio: number | null;
  status: 'pending' | 'active' | 'complete';
}

export interface StreamsResponse {
  totals: {
    streamCount: number;
    activeCount: number;
    completeCount: number;
    pendingCount: number;
  };
  streams: StreamRow[];
}

export async function GET() {
  try {
    const sql = ponderSql();

    const rows = await sql`
      SELECT s.id,
             s.recipient,
             s.payer,
             s.token_address,
             s.token_amount::TEXT AS token_amount,
             s.start_time::TEXT AS start_time,
             s.stop_time::TEXT AS stop_time,
             s.stream_address,
             s.block_timestamp::TEXT AS block_timestamp,
             CASE
               WHEN EXTRACT(EPOCH FROM NOW())::BIGINT <= s.start_time THEN 0
               WHEN EXTRACT(EPOCH FROM NOW())::BIGINT >= s.stop_time THEN 1
               ELSE (EXTRACT(EPOCH FROM NOW())::BIGINT - s.start_time)::FLOAT
                    / NULLIF((s.stop_time - s.start_time)::FLOAT, 0)
             END AS vested_ratio,
             CASE
               WHEN EXTRACT(EPOCH FROM NOW())::BIGINT < s.start_time THEN 'pending'
               WHEN EXTRACT(EPOCH FROM NOW())::BIGINT >= s.stop_time THEN 'complete'
               ELSE 'active'
             END AS status,
             e.name AS recipient_ens
      FROM ponder_live.streams s
      LEFT JOIN ponder_live.ens_names e ON e.address = s.recipient
      ORDER BY s.block_timestamp DESC
    `;

    // Batch read on-chain stream-contract token balances via multicall.
    // claimed = tokenAmount - balanceOf(streamAddress), since the only flow
    // out of a Sablier-style stream contract is recipient withdrawals.
    const balanceCalls = rows.map((r) => ({
      address: String(r.token_address).toLowerCase() as `0x${string}`,
      abi: erc20Abi,
      functionName: 'balanceOf' as const,
      args: [String(r.stream_address).toLowerCase() as `0x${string}`] as const,
    }));

    let balanceResults: Array<{ status: 'success' | 'failure'; result?: bigint }> = [];
    try {
      const client = getMainnetClient();
      balanceResults = (await client.multicall({
        contracts: balanceCalls,
        allowFailure: true,
      })) as typeof balanceResults;
    } catch (err) {
      // If multicall as a whole fails, leave every row's claim data null.
      console.error('[streams] multicall failed:', err);
    }

    const streams: StreamRow[] = rows.map((r, i) => {
      const tokenAmount = BigInt(String(r.token_amount));
      const balResult = balanceResults[i];
      let claimedRaw: string | null = null;
      let claimedRatio: number | null = null;
      if (balResult?.status === 'success' && balResult.result !== undefined) {
        const remaining = balResult.result;
        const claimed = tokenAmount > remaining ? tokenAmount - remaining : BigInt(0);
        claimedRaw = claimed.toString();
        claimedRatio =
          tokenAmount === BigInt(0)
            ? 0
            : Number((claimed * BigInt(10_000)) / tokenAmount) / 10_000;
      }
      return {
        id: String(r.id),
        recipient: String(r.recipient).toLowerCase(),
        recipientEns: r.recipient_ens ? String(r.recipient_ens) : null,
        payer: String(r.payer).toLowerCase(),
        tokenAddress: String(r.token_address).toLowerCase(),
        tokenAmountRaw: String(r.token_amount),
        startTime: String(r.start_time),
        stopTime: String(r.stop_time),
        streamAddress: String(r.stream_address).toLowerCase(),
        blockTimestamp: String(r.block_timestamp),
        vestedRatio: Number(r.vested_ratio ?? 0),
        claimedRaw,
        claimedRatio,
        status: r.status as StreamRow['status'],
      };
    });

    const totals = streams.reduce(
      (acc, s) => {
        acc.streamCount += 1;
        if (s.status === 'active') acc.activeCount += 1;
        else if (s.status === 'complete') acc.completeCount += 1;
        else acc.pendingCount += 1;
        return acc;
      },
      { streamCount: 0, activeCount: 0, completeCount: 0, pendingCount: 0 },
    );

    const response: StreamsResponse = { totals, streams };
    return NextResponse.json(response);
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    console.error('[API] treasury/streams failed:', message);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
