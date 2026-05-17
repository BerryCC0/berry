/**
 * GET /api/nouns/treasury/client-rewards
 *
 * Client incentives accounting:
 *   - Registry of all on-chain clients with totalRewarded / totalWithdrawn /
 *     remaining balance (rewarded - withdrawn)
 *   - All-time + last-30d distribution totals from client_reward_events
 *   - Recent rewards and withdrawals (interleaved feed, capped)
 */

import { NextResponse } from 'next/server';
import { ponderSql } from '@/app/lib/ponder-db';

const FEED_LIMIT = 40;

export interface ClientRow {
  clientId: number;
  name: string;
  description: string;
  approved: boolean;
  totalRewardedWei: string;
  totalWithdrawnWei: string;
  remainingBalanceWei: string;
}

export interface RewardEventRow {
  kind: 'rewarded' | 'withdrawn';
  id: string;
  clientId: number;
  amountWei: string;
  blockTimestamp: string;
  /** Withdrawals only: address that received the funds. */
  to: string | null;
  /** Withdrawals only: server-resolved ENS for `to`, when available. */
  toEns: string | null;
}

export interface ClientRewardsResponse {
  totals: {
    clientCount: number;
    approvedCount: number;
    totalRewardedWei: string;
    totalWithdrawnWei: string;
    totalRemainingWei: string;
  };
  last30d: {
    rewardedWei: string;
    rewardEventCount: number;
    withdrawnWei: string;
    withdrawalCount: number;
  };
  clients: ClientRow[];
  recent: RewardEventRow[];
}

export async function GET() {
  try {
    const sql = ponderSql();

    const [clientRows, last30dRewardRows, last30dWithdrawRows, recentRewardRows, recentWithdrawalRows] =
      await Promise.all([
        sql`
          SELECT client_id, name, description, approved,
                 total_rewarded::TEXT AS total_rewarded,
                 total_withdrawn::TEXT AS total_withdrawn
          FROM ponder_live.clients
          ORDER BY client_id ASC
        `,
        sql`
          WITH cutoff AS (SELECT EXTRACT(EPOCH FROM (NOW() - INTERVAL '30 days'))::BIGINT AS ts)
          SELECT COALESCE(SUM(amount), 0)::TEXT AS total_wei,
                 COUNT(*)::INT AS event_count
          FROM ponder_live.client_reward_events r, cutoff
          WHERE r.block_timestamp >= cutoff.ts
        `,
        sql`
          WITH cutoff AS (SELECT EXTRACT(EPOCH FROM (NOW() - INTERVAL '30 days'))::BIGINT AS ts)
          SELECT COALESCE(SUM(amount), 0)::TEXT AS total_wei,
                 COUNT(*)::INT AS event_count
          FROM ponder_live.client_withdrawals w, cutoff
          WHERE w.block_timestamp >= cutoff.ts
        `,
        sql`
          SELECT id, client_id, amount::TEXT AS amount,
                 block_timestamp::TEXT AS block_timestamp
          FROM ponder_live.client_reward_events
          ORDER BY block_timestamp DESC
          LIMIT ${FEED_LIMIT}
        `,
        sql`
          SELECT w.id, w.client_id, w.amount::TEXT AS amount, w."to" AS to_addr,
                 w.block_timestamp::TEXT AS block_timestamp,
                 e.name AS to_ens
          FROM ponder_live.client_withdrawals w
          LEFT JOIN ponder_live.ens_names e ON e.address = w."to"
          ORDER BY w.block_timestamp DESC
          LIMIT ${FEED_LIMIT}
        `,
      ]);

    const clients: ClientRow[] = clientRows.map((r) => {
      const rewarded = BigInt(String(r.total_rewarded ?? '0'));
      const withdrawn = BigInt(String(r.total_withdrawn ?? '0'));
      return {
        clientId: Number(r.client_id),
        name: String(r.name ?? ''),
        description: String(r.description ?? ''),
        approved: Boolean(r.approved),
        totalRewardedWei: rewarded.toString(),
        totalWithdrawnWei: withdrawn.toString(),
        remainingBalanceWei: (rewarded - withdrawn).toString(),
      };
    });

    const totals = clients.reduce(
      (acc, c) => {
        acc.totalRewardedWei += BigInt(c.totalRewardedWei);
        acc.totalWithdrawnWei += BigInt(c.totalWithdrawnWei);
        acc.totalRemainingWei += BigInt(c.remainingBalanceWei);
        if (c.approved) acc.approvedCount += 1;
        return acc;
      },
      {
        totalRewardedWei: BigInt(0),
        totalWithdrawnWei: BigInt(0),
        totalRemainingWei: BigInt(0),
        approvedCount: 0,
      },
    );

    const recent: RewardEventRow[] = [
      ...recentRewardRows.map<RewardEventRow>((r) => ({
        kind: 'rewarded',
        id: String(r.id),
        clientId: Number(r.client_id),
        amountWei: String(r.amount),
        blockTimestamp: String(r.block_timestamp),
        to: null,
        toEns: null,
      })),
      ...recentWithdrawalRows.map<RewardEventRow>((r) => ({
        kind: 'withdrawn',
        id: String(r.id),
        clientId: Number(r.client_id),
        amountWei: String(r.amount),
        blockTimestamp: String(r.block_timestamp),
        to: r.to_addr ? String(r.to_addr).toLowerCase() : null,
        toEns: r.to_ens ? String(r.to_ens) : null,
      })),
    ]
      .sort((a, b) => Number(b.blockTimestamp) - Number(a.blockTimestamp))
      .slice(0, FEED_LIMIT);

    const last30dReward = last30dRewardRows[0] ?? {};
    const last30dWithdraw = last30dWithdrawRows[0] ?? {};

    const response: ClientRewardsResponse = {
      totals: {
        clientCount: clients.length,
        approvedCount: totals.approvedCount,
        totalRewardedWei: totals.totalRewardedWei.toString(),
        totalWithdrawnWei: totals.totalWithdrawnWei.toString(),
        totalRemainingWei: totals.totalRemainingWei.toString(),
      },
      last30d: {
        rewardedWei: String(last30dReward.total_wei ?? '0'),
        rewardEventCount: Number(last30dReward.event_count ?? 0),
        withdrawnWei: String(last30dWithdraw.total_wei ?? '0'),
        withdrawalCount: Number(last30dWithdraw.event_count ?? 0),
      },
      clients,
      recent,
    };

    return NextResponse.json(response);
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    console.error('[API] treasury/client-rewards failed:', message);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
