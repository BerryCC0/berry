/**
 * Client Reward Updates API Route
 * Returns ProposalRewardsUpdated and AuctionRewardsUpdated events
 * with parsed params for charting reward economics over time
 */

import { NextRequest, NextResponse } from 'next/server';
import { ponderSql } from '@/app/lib/ponder-db';

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const updateType = searchParams.get('type'); // 'PROPOSAL' | 'AUCTION' | null (all)
  const limit = Math.min(parseInt(searchParams.get('limit') || '500'), 2000);

  try {
    const sql = ponderSql();

    let rows;
    if (updateType) {
      rows = await sql`
        SELECT id, update_type, params,
               block_number::text as block_number,
               block_timestamp::text as block_timestamp
        FROM ponder_live.reward_updates
        WHERE update_type = ${updateType}
        ORDER BY block_timestamp ASC
        LIMIT ${limit}
      `;
    } else {
      rows = await sql`
        SELECT id, update_type, params,
               block_number::text as block_number,
               block_timestamp::text as block_timestamp
        FROM ponder_live.reward_updates
        ORDER BY block_timestamp ASC
        LIMIT ${limit}
      `;
    }

    const updates = rows.map((r: any) => {
      const params = typeof r.params === 'string' ? JSON.parse(r.params) : r.params;

      return {
        id: r.id,
        updateType: r.update_type,
        blockNumber: r.block_number,
        blockTimestamp: r.block_timestamp,
        // Structured fields from params
        firstProposalId: params.firstProposalId ?? null,
        lastProposalId: params.lastProposalId ?? null,
        firstAuctionIdForRevenue: params.firstAuctionIdForRevenue ?? null,
        lastAuctionIdForRevenue: params.lastAuctionIdForRevenue ?? null,
        firstAuctionId: params.firstAuctionId ?? null,
        lastAuctionId: params.lastAuctionId ?? null,
        auctionRevenue: params.auctionRevenue ?? null,
        rewardPerProposal: params.rewardPerProposal ?? null,
        rewardPerVote: params.rewardPerVote ?? null,
      };
    });

    return NextResponse.json({ updates });
  } catch (error) {
    console.error('[API] Failed to fetch reward updates:', error);
    return NextResponse.json({ error: 'Failed to fetch reward updates' }, { status: 500 });
  }
}
