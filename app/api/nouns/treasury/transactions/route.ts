/**
 * GET /api/nouns/treasury/transactions
 *
 * Treasury timelock activity from ponder_live.treasury_txs:
 *   - Aggregated counts by status (QUEUED / EXECUTED / CANCELLED)
 *   - All-time and last-30d outflow totals (executed value only)
 *   - Pending queue (with eta)
 *   - Recent executed + cancelled transactions
 *
 * Joined against ponder_live.ens_names so the UI can render names without
 * a second round-trip per row.
 */

import { NextResponse } from 'next/server';
import { ponderSql } from '@/app/lib/ponder-db';

const PER_KIND_LIMIT = 100;

export interface TreasuryTxRow {
  id: string;
  txHash: string;
  target: string;
  targetEns: string | null;
  valueWei: string;
  signature: string;
  data: string;
  eta: string;
  status: string;
  treasuryVersion: string;
  blockTimestamp: string;
}

export interface TreasuryTxsResponse {
  totals: {
    queuedCount: number;
    executedCount: number;
    cancelledCount: number;
    outflowsExecutedWei: string;
    outflowsCancelledWei: string;
  };
  last30d: {
    outflowsExecutedWei: string;
    executedCount: number;
  };
  pending: TreasuryTxRow[];
  executed: TreasuryTxRow[];
  cancelled: TreasuryTxRow[];
}

export async function GET() {
  try {
    const sql = ponderSql();

    // The Ponder handler INSERTs a new row per event (Queue/Execute/Cancel)
    // rather than UPDATEing the existing row. Truly-pending = QUEUED rows
    // whose txHash hasn't subsequently been executed or cancelled.
    const [totalsRows, last30dRows, pendingRows, executedRows, cancelledRows] =
      await Promise.all([
        sql`
          WITH settled AS (
            SELECT DISTINCT tx_hash
            FROM ponder_live.treasury_txs
            WHERE status IN ('EXECUTED', 'CANCELLED')
          )
          SELECT
            COALESCE(SUM(value) FILTER (WHERE status = 'EXECUTED'), 0)::TEXT AS outflows_executed_wei,
            COALESCE(SUM(value) FILTER (WHERE status = 'CANCELLED'), 0)::TEXT AS outflows_cancelled_wei,
            COUNT(*) FILTER (WHERE status = 'QUEUED' AND tx_hash NOT IN (SELECT tx_hash FROM settled))::INT AS queued_count,
            COUNT(*) FILTER (WHERE status = 'EXECUTED')::INT AS executed_count,
            COUNT(*) FILTER (WHERE status = 'CANCELLED')::INT AS cancelled_count
          FROM ponder_live.treasury_txs
        `,
        sql`
          WITH cutoff AS (
            SELECT EXTRACT(EPOCH FROM (NOW() - INTERVAL '30 days'))::BIGINT AS ts
          )
          SELECT
            COALESCE(SUM(t.value), 0)::TEXT AS outflows_executed_wei,
            COUNT(*)::INT AS executed_count
          FROM ponder_live.treasury_txs t, cutoff
          WHERE t.status = 'EXECUTED' AND t.block_timestamp >= cutoff.ts
        `,
        sql`
          SELECT t.id, t.tx_hash, t.target, t.value::TEXT AS value, t.signature,
                 t.data, t.eta::TEXT AS eta, t.status, t.treasury_version,
                 t.block_timestamp::TEXT AS block_timestamp,
                 e.name AS target_ens
          FROM ponder_live.treasury_txs t
          LEFT JOIN ponder_live.ens_names e ON e.address = t.target
          WHERE t.status = 'QUEUED'
            AND t.tx_hash NOT IN (
              SELECT tx_hash FROM ponder_live.treasury_txs
              WHERE status IN ('EXECUTED', 'CANCELLED')
            )
          ORDER BY t.eta ASC
        `,
        sql`
          SELECT t.id, t.tx_hash, t.target, t.value::TEXT AS value, t.signature,
                 t.data, t.eta::TEXT AS eta, t.status, t.treasury_version,
                 t.block_timestamp::TEXT AS block_timestamp,
                 e.name AS target_ens
          FROM ponder_live.treasury_txs t
          LEFT JOIN ponder_live.ens_names e ON e.address = t.target
          WHERE t.status = 'EXECUTED'
          ORDER BY t.block_timestamp DESC
          LIMIT ${PER_KIND_LIMIT}
        `,
        sql`
          SELECT t.id, t.tx_hash, t.target, t.value::TEXT AS value, t.signature,
                 t.data, t.eta::TEXT AS eta, t.status, t.treasury_version,
                 t.block_timestamp::TEXT AS block_timestamp,
                 e.name AS target_ens
          FROM ponder_live.treasury_txs t
          LEFT JOIN ponder_live.ens_names e ON e.address = t.target
          WHERE t.status = 'CANCELLED'
          ORDER BY t.block_timestamp DESC
          LIMIT ${PER_KIND_LIMIT}
        `,
      ]);

    const totals = totalsRows[0] ?? {};
    const last30d = last30dRows[0] ?? {};

    const mapRow = (r: Record<string, unknown>): TreasuryTxRow => ({
      id: String(r.id),
      txHash: String(r.tx_hash),
      target: String(r.target).toLowerCase(),
      targetEns: r.target_ens ? String(r.target_ens) : null,
      valueWei: String(r.value),
      signature: String(r.signature ?? ''),
      data: String(r.data ?? '0x'),
      eta: String(r.eta),
      status: String(r.status),
      treasuryVersion: String(r.treasury_version),
      blockTimestamp: String(r.block_timestamp),
    });

    const response: TreasuryTxsResponse = {
      totals: {
        queuedCount: Number(totals.queued_count ?? 0),
        executedCount: Number(totals.executed_count ?? 0),
        cancelledCount: Number(totals.cancelled_count ?? 0),
        outflowsExecutedWei: String(totals.outflows_executed_wei ?? '0'),
        outflowsCancelledWei: String(totals.outflows_cancelled_wei ?? '0'),
      },
      last30d: {
        outflowsExecutedWei: String(last30d.outflows_executed_wei ?? '0'),
        executedCount: Number(last30d.executed_count ?? 0),
      },
      pending: pendingRows.map(mapRow),
      executed: executedRows.map(mapRow),
      cancelled: cancelledRows.map(mapRow),
    };

    return NextResponse.json(response);
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    console.error('[API] treasury/transactions failed:', message);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
