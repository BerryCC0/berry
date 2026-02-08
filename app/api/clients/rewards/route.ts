/**
 * Client Rewards Time Series API Route
 * Returns reward events with client names for charting
 */

import { NextRequest, NextResponse } from 'next/server';
import { ponderSql } from '@/app/lib/ponder-db';

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const clientId = searchParams.get('clientId');
  const limit = Math.min(parseInt(searchParams.get('limit') || '1000'), 5000);

  try {
    const sql = ponderSql();

    let rows;
    if (clientId) {
      rows = await sql`
        SELECT r.id, r.client_id, r.amount::text as amount,
               r.block_number::text as block_number,
               r.block_timestamp::text as block_timestamp,
               c.name as client_name
        FROM ponder_live.client_reward_events r
        LEFT JOIN ponder_live.clients c ON r.client_id = c.client_id
        WHERE r.client_id = ${parseInt(clientId)}
        ORDER BY r.block_timestamp ASC
        LIMIT ${limit}
      `;
    } else {
      rows = await sql`
        SELECT r.id, r.client_id, r.amount::text as amount,
               r.block_number::text as block_number,
               r.block_timestamp::text as block_timestamp,
               c.name as client_name
        FROM ponder_live.client_reward_events r
        LEFT JOIN ponder_live.clients c ON r.client_id = c.client_id
        ORDER BY r.block_timestamp ASC
        LIMIT ${limit}
      `;
    }

    const rewards = rows.map((r: any) => ({
      id: r.id,
      clientId: r.client_id,
      clientName: r.client_name,
      amount: r.amount,
      blockNumber: r.block_number,
      blockTimestamp: r.block_timestamp,
    }));

    return NextResponse.json({ rewards });
  } catch (error) {
    console.error('[API] Failed to fetch client rewards:', error);
    return NextResponse.json({ error: 'Failed to fetch rewards' }, { status: 500 });
  }
}
