/**
 * GET /api/food-nouns/treasury
 *
 * Treasury overview built from indexed data:
 *   - Inflows: settled auctions with a real winner (zero-address = no-bid auction)
 *   - Outflows: executed timelock transactions
 *   - Cancelled outflows: cancelled timelock transactions
 *   - Pending queue: status='queued' timelock transactions (with eta)
 *   - Unified recent activity feed (inflows + executes + cancels, sorted desc)
 *   - Nouns owned by the treasury address (V1 forks sometimes accumulate these)
 *
 * Each timelock entry is decoded server-side via decodeTreasuryTx — the client
 * gets render-ready function name + typed inputs and never needs an ABI.
 */

import { NextResponse } from 'next/server';
import { ponderSql } from '@/app/lib/ponder-db';
import {
  decodeTreasuryTx,
  type DecodedTreasuryTx,
} from '@/app/lib/food-nouns/decodeTreasuryTx';
import { FN_AUCTION_SPLIT } from '@/OS/Apps/nouns/FoodNouns/contracts';

// Lowercase, since Postgres hex columns store addresses in lowercase form and
// equality is case-sensitive. Matches FN_ADDRESSES.treasury exactly.
const FN_TREASURY = '0xaf1bfd8bf02c5ec169d20faba53bf0fa761bf65f';
const ZERO_ADDR = '0x0000000000000000000000000000000000000000';

// Cap row fetches per kind so the merged feed has good recency without
// pulling years of data on every request.
const PER_KIND_LIMIT = 100;
const FEED_LIMIT = 60;

interface InflowFeedItem {
  kind: 'inflow';
  timestamp: string;
  txHash: null;
  nounId: number;
  /** Gross winning bid emitted in AuctionSettled. */
  amountWei: string;
  /** Treasury's share of this bid (50% per the auction-house split). */
  treasuryShareWei: string;
  winner: string;
}

interface ExecuteFeedItem {
  kind: 'execute';
  timestamp: string;
  txHash: string;
  target: string;
  valueWei: string;
  signature: string;
  eta: string;
  decoded: DecodedTreasuryTx;
}

interface CancelFeedItem {
  kind: 'cancel';
  timestamp: string;
  txHash: string;
  target: string;
  valueWei: string;
  signature: string;
  eta: string;
  decoded: DecodedTreasuryTx;
}

export type FNTreasuryFeedItem =
  | InflowFeedItem
  | ExecuteFeedItem
  | CancelFeedItem;

export interface FNTreasuryPendingItem {
  id: string;
  target: string;
  valueWei: string;
  signature: string;
  eta: string;
  queuedTimestamp: string;
  queuedTxHash: string;
  decoded: DecodedTreasuryTx;
}

export interface FNTreasurySplitEntry {
  address: string;
  label: string;
  sub: string;
  percent: number;
  /** Allocated wei across all settled auctions = grossWei × percent / 100. */
  allocatedWei: string;
}

export interface FNTreasuryResponse {
  totals: {
    /**
     * Gross winning bids across every settled auction. NOT the amount that
     * reached this treasury — the FN auction house splits each bid four ways.
     * See `splits` for the per-recipient breakdown and `treasuryReceivedWei`
     * for the amount that actually landed here.
     */
    grossAuctionProceedsWei: string;
    /** Treasury's share per the on-chain 50% allocation. Exact-share approximation
     *  of actual measured inflows; integer-division rounding may differ by wei. */
    treasuryShareWei: string;
    outflowsExecutedWei: string;
    outflowsCancelledWei: string;
    inflowCount: number;
    queuedCount: number;
    executedCount: number;
    cancelledCount: number;
  };
  /** Per-recipient breakdown of the four-way auction proceeds split. */
  splits: FNTreasurySplitEntry[];
  last30d: {
    /** Gross last-30d auction proceeds (sum of winning bids settled in the window). */
    grossAuctionProceedsWei: string;
    /** Treasury's 50% share for the last-30d window. */
    treasuryShareWei: string;
    outflowsWei: string;
    /** Treasury share − executed outflows over the same window. Signed. */
    netWei: string;
  };
  pending: FNTreasuryPendingItem[];
  recent: FNTreasuryFeedItem[];
  treasuryNouns: Array<{ id: number; svg: string }>;
}

export async function GET() {
  try {
    const sql = ponderSql();

    const [
      totalsRows,
      statusCountsRows,
      last30dRows,
      pendingRows,
      inflowRows,
      executeRows,
      cancelRows,
      treasuryNounsRows,
    ] = await Promise.all([
      // All-time aggregates
      sql`
        SELECT
          COALESCE((
            SELECT SUM(amount)::TEXT
            FROM ponder_live.food_auctions
            WHERE settled = true
              AND winner IS NOT NULL
              AND winner != ${ZERO_ADDR}
          ), '0') AS inflows_wei,
          COALESCE((
            SELECT SUM(value)::TEXT
            FROM ponder_live.food_treasury_transactions
            WHERE status = 'executed'
          ), '0') AS outflows_executed_wei,
          COALESCE((
            SELECT SUM(value)::TEXT
            FROM ponder_live.food_treasury_transactions
            WHERE status = 'cancelled'
          ), '0') AS outflows_cancelled_wei,
          (
            SELECT COUNT(*)::INT
            FROM ponder_live.food_auctions
            WHERE settled = true
              AND winner IS NOT NULL
              AND winner != ${ZERO_ADDR}
          ) AS inflow_count
      `,
      sql`
        SELECT status, COUNT(*)::INT AS n
        FROM ponder_live.food_treasury_transactions
        GROUP BY status
      `,
      // Last-30-days window. Compare against indexed block timestamps in
      // unix seconds; NOW()-30d converted the same way.
      sql`
        WITH cutoff AS (
          SELECT EXTRACT(EPOCH FROM (NOW() - INTERVAL '30 days'))::BIGINT AS ts
        )
        SELECT
          COALESCE((
            SELECT SUM(amount)::TEXT
            FROM ponder_live.food_auctions, cutoff
            WHERE settled = true
              AND winner IS NOT NULL
              AND winner != ${ZERO_ADDR}
              AND settled_timestamp >= cutoff.ts
          ), '0') AS inflows_wei,
          COALESCE((
            SELECT SUM(value)::TEXT
            FROM ponder_live.food_treasury_transactions, cutoff
            WHERE status = 'executed'
              AND executed_timestamp >= cutoff.ts
          ), '0') AS outflows_wei
      `,
      // Currently-pending queue
      sql`
        SELECT id, target, value::TEXT AS value, signature, data, eta::TEXT AS eta,
               queued_timestamp::TEXT AS queued_timestamp,
               queued_tx_hash
        FROM ponder_live.food_treasury_transactions
        WHERE status = 'queued'
        ORDER BY queued_timestamp DESC NULLS LAST
      `,
      // Inflows feed source
      sql`
        SELECT noun_id, amount::TEXT AS amount, winner,
               settled_timestamp::TEXT AS settled_timestamp
        FROM ponder_live.food_auctions
        WHERE settled = true
          AND winner IS NOT NULL
          AND winner != ${ZERO_ADDR}
        ORDER BY settled_timestamp DESC
        LIMIT ${PER_KIND_LIMIT}
      `,
      // Executed outflows feed source
      sql`
        SELECT target, value::TEXT AS value, signature, data,
               eta::TEXT AS eta,
               executed_timestamp::TEXT AS executed_timestamp,
               executed_tx_hash
        FROM ponder_live.food_treasury_transactions
        WHERE status = 'executed'
        ORDER BY executed_timestamp DESC NULLS LAST
        LIMIT ${PER_KIND_LIMIT}
      `,
      // Cancelled feed source
      sql`
        SELECT target, value::TEXT AS value, signature, data,
               eta::TEXT AS eta,
               cancelled_timestamp::TEXT AS cancelled_timestamp,
               cancelled_tx_hash
        FROM ponder_live.food_treasury_transactions
        WHERE status = 'cancelled'
        ORDER BY cancelled_timestamp DESC NULLS LAST
        LIMIT ${PER_KIND_LIMIT}
      `,
      // Nouns owned by the treasury (rare for V1 forks but worth surfacing)
      sql`
        SELECT id, svg
        FROM ponder_live.food_nouns
        WHERE owner = ${FN_TREASURY}
        ORDER BY id ASC
      `,
    ]);

    const totalsRow = totalsRows[0] ?? {};
    const last30dRow = last30dRows[0] ?? {};

    const counts: Record<string, number> = {};
    for (const r of statusCountsRows) {
      counts[String(r.status)] = Number(r.n);
    }

    // Treasury's slice of every auction. Pulled from the central FN_AUCTION_SPLIT
    // constant so the activity feed, totals, splits breakdown, and 30d window
    // all use the same canonical percentage.
    const treasuryPercent = BigInt(
      FN_AUCTION_SPLIT.find(
        (s) => s.address.toLowerCase() === FN_TREASURY,
      )?.percent ?? 50,
    );

    // Decode every timelock row in parallel. Cache hits make repeats cheap;
    // first request after server start pays the ABI-fetch cost only for txs
    // whose signature is empty (rare).
    const allTimelock = [
      ...executeRows.map((r) => ({
        target: String(r.target),
        value: String(r.value),
        signature: String(r.signature ?? ''),
        data: String(r.data ?? '0x'),
      })),
      ...cancelRows.map((r) => ({
        target: String(r.target),
        value: String(r.value),
        signature: String(r.signature ?? ''),
        data: String(r.data ?? '0x'),
      })),
      ...pendingRows.map((r) => ({
        target: String(r.target),
        value: String(r.value),
        signature: String(r.signature ?? ''),
        data: String(r.data ?? '0x'),
      })),
    ];
    const decodedAll = await Promise.all(allTimelock.map(decodeTreasuryTx));

    const execDecoded = decodedAll.slice(0, executeRows.length);
    const cancelDecoded = decodedAll.slice(
      executeRows.length,
      executeRows.length + cancelRows.length,
    );
    const pendingDecoded = decodedAll.slice(
      executeRows.length + cancelRows.length,
    );

    // Build the unified feed
    const feed: FNTreasuryFeedItem[] = [];

    for (const r of inflowRows) {
      const amount = BigInt(String(r.amount ?? '0'));
      feed.push({
        kind: 'inflow',
        timestamp: String(r.settled_timestamp),
        txHash: null,
        nounId: Number(r.noun_id),
        amountWei: amount.toString(),
        treasuryShareWei: ((amount * treasuryPercent) / BigInt(100)).toString(),
        winner: String(r.winner).toLowerCase(),
      });
    }

    executeRows.forEach((r, i) => {
      feed.push({
        kind: 'execute',
        timestamp: String(r.executed_timestamp ?? '0'),
        txHash: String(r.executed_tx_hash ?? ''),
        target: String(r.target).toLowerCase(),
        valueWei: String(r.value),
        signature: String(r.signature ?? ''),
        eta: String(r.eta),
        decoded: execDecoded[i]!,
      });
    });

    cancelRows.forEach((r, i) => {
      feed.push({
        kind: 'cancel',
        timestamp: String(r.cancelled_timestamp ?? '0'),
        txHash: String(r.cancelled_tx_hash ?? ''),
        target: String(r.target).toLowerCase(),
        valueWei: String(r.value),
        signature: String(r.signature ?? ''),
        eta: String(r.eta),
        decoded: cancelDecoded[i]!,
      });
    });

    feed.sort((a, b) => Number(b.timestamp) - Number(a.timestamp));
    const recent = feed.slice(0, FEED_LIMIT);

    // Pending list
    const pending: FNTreasuryPendingItem[] = pendingRows.map((r, i) => ({
      id: String(r.id),
      target: String(r.target).toLowerCase(),
      valueWei: String(r.value),
      signature: String(r.signature ?? ''),
      eta: String(r.eta),
      queuedTimestamp: String(r.queued_timestamp ?? '0'),
      queuedTxHash: String(r.queued_tx_hash ?? ''),
      decoded: pendingDecoded[i]!,
    }));

    // Totals. Note the semantic distinction:
    //   - `grossAuctionProceedsWei` = SUM of every winning bid (what the chain
    //     emits in AuctionSettled.amount). This is gross protocol revenue.
    //   - `treasuryShareWei`        = gross × FN_TREASURY_PERCENT / 100.
    //     What actually reaches this treasury via _safeTransferETHWithFallback.
    const grossAuctionProceedsWei = String(totalsRow.inflows_wei ?? '0');
    const outflowsExecutedWei = String(totalsRow.outflows_executed_wei ?? '0');
    const outflowsCancelledWei = String(totalsRow.outflows_cancelled_wei ?? '0');

    const treasuryShareWei = (
      (BigInt(grossAuctionProceedsWei) * treasuryPercent) /
      BigInt(100)
    ).toString();

    // Per-recipient split breakdown — exact wei using integer arithmetic
    // (matches the contract's own `(amount * pct) / 100` exactly at aggregate
    // level modulo per-auction wei-level rounding).
    const splits = FN_AUCTION_SPLIT.map((s) => ({
      address: s.address.toLowerCase(),
      label: s.label,
      sub: s.sub,
      percent: s.percent,
      allocatedWei: (
        (BigInt(grossAuctionProceedsWei) * BigInt(s.percent)) /
        BigInt(100)
      ).toString(),
    }));

    const last30dGross = String(last30dRow.inflows_wei ?? '0');
    const last30dOutflows = String(last30dRow.outflows_wei ?? '0');
    const last30dTreasuryShare = (
      (BigInt(last30dGross) * treasuryPercent) /
      BigInt(100)
    ).toString();
    const last30dNet = (
      BigInt(last30dTreasuryShare) - BigInt(last30dOutflows)
    ).toString();

    const response: FNTreasuryResponse = {
      totals: {
        grossAuctionProceedsWei,
        treasuryShareWei,
        outflowsExecutedWei,
        outflowsCancelledWei,
        inflowCount: Number(totalsRow.inflow_count ?? 0),
        queuedCount: counts.queued ?? 0,
        executedCount: counts.executed ?? 0,
        cancelledCount: counts.cancelled ?? 0,
      },
      splits,
      last30d: {
        grossAuctionProceedsWei: last30dGross,
        treasuryShareWei: last30dTreasuryShare,
        outflowsWei: last30dOutflows,
        netWei: last30dNet,
      },
      pending,
      recent,
      treasuryNouns: treasuryNounsRows.map((r) => ({
        id: Number(r.id),
        svg: String(r.svg ?? ''),
      })),
    };

    return NextResponse.json(response);
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
