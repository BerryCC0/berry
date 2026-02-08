/**
 * Clients API Route
 * Queries ponder_live tables for client incentives data
 */

import { NextRequest, NextResponse } from 'next/server';
import { ponderSql } from '@/app/lib/ponder-db';

export async function GET(request: NextRequest) {
  try {
    const sql = ponderSql();

    // Fetch clients with aggregated vote/proposal/auction/bid counts in parallel
    const [clientRows, voteCounts, proposalCounts, auctionCounts, bidCounts] = await Promise.all([
      // All registered clients
      sql`
        SELECT client_id, name, description, approved,
               total_rewarded::text as total_rewarded,
               total_withdrawn::text as total_withdrawn,
               block_timestamp::text as block_timestamp
        FROM ponder_live.clients
        ORDER BY total_rewarded DESC
      `,
      // Vote counts per client
      sql`
        SELECT client_id, COUNT(*)::int as vote_count
        FROM ponder_live.votes
        WHERE client_id IS NOT NULL
        GROUP BY client_id
      `,
      // Proposal counts per client
      sql`
        SELECT client_id, COUNT(*)::int as proposal_count
        FROM ponder_live.proposals
        WHERE client_id IS NOT NULL
        GROUP BY client_id
      `,
      // Auction win counts per client
      sql`
        SELECT client_id, COUNT(*)::int as auction_count,
               COALESCE(SUM(amount), 0)::text as auction_volume
        FROM ponder_live.auctions
        WHERE client_id IS NOT NULL AND settled = true
        GROUP BY client_id
      `,
      // Bid counts per client
      sql`
        SELECT client_id, COUNT(*)::int as bid_count,
               COALESCE(SUM(amount), 0)::text as bid_volume
        FROM ponder_live.auction_bids
        WHERE client_id IS NOT NULL
        GROUP BY client_id
      `,
    ]);

    // Build lookup maps
    const voteMap = new Map(voteCounts.map((r: any) => [r.client_id, r.vote_count]));
    const proposalMap = new Map(proposalCounts.map((r: any) => [r.client_id, r.proposal_count]));
    const auctionMap = new Map(auctionCounts.map((r: any) => [r.client_id, { count: r.auction_count, volume: r.auction_volume }]));
    const bidMap = new Map(bidCounts.map((r: any) => [r.client_id, { count: r.bid_count, volume: r.bid_volume }]));

    const clients = clientRows.map((c: any) => ({
      clientId: c.client_id,
      name: c.name,
      description: c.description,
      approved: c.approved,
      totalRewarded: c.total_rewarded,
      totalWithdrawn: c.total_withdrawn,
      blockTimestamp: c.block_timestamp,
      voteCount: voteMap.get(c.client_id) ?? 0,
      proposalCount: proposalMap.get(c.client_id) ?? 0,
      auctionCount: auctionMap.get(c.client_id)?.count ?? 0,
      auctionVolume: auctionMap.get(c.client_id)?.volume ?? '0',
      bidCount: bidMap.get(c.client_id)?.count ?? 0,
      bidVolume: bidMap.get(c.client_id)?.volume ?? '0',
    }));

    return NextResponse.json({ clients });
  } catch (error) {
    console.error('[API] Failed to fetch clients:', error);
    return NextResponse.json({ error: 'Failed to fetch clients' }, { status: 500 });
  }
}
