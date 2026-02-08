/**
 * Clients API Route
 * Queries ponder_live tables for client incentives data
 */

import { NextRequest, NextResponse } from 'next/server';
import { ponderSql } from '@/app/lib/ponder-db';
import { CLIENT_NAMES } from '@/OS/lib/clientNames';

export async function GET(request: NextRequest) {
  try {
    const sql = ponderSql();

    // Fetch clients with aggregated counts in parallel
    // Uses event tables (ground truth) instead of accumulated fields on clients row
    const [clientRows, voteCounts, proposalCounts, auctionCounts, bidCounts, rewardSums, withdrawalSums] = await Promise.all([
      // All registered clients (no longer relying on total_rewarded/total_withdrawn)
      sql`
        SELECT client_id, name, description, approved,
               block_timestamp::text as block_timestamp
        FROM ponder_live.clients
        ORDER BY client_id ASC
      `,
      // Vote counts per client -- uses the client_votes view (INNER JOIN votes + clients)
      sql`
        SELECT client_id, COUNT(*)::int as vote_count
        FROM ponder_live.client_votes
        GROUP BY client_id
      `,
      // Proposal counts per client
      sql`
        SELECT client_id, COUNT(*)::int as proposal_count
        FROM ponder_live.proposals
        WHERE client_id IS NOT NULL
        GROUP BY client_id
      `,
      // Auction win counts per client -- winning bids (bidder=winner, amount=winning amount)
      // auctions.clientId is unreliable (overwritten by settler), so we join bids to auctions
      sql`
        SELECT b.client_id, COUNT(*)::int as auction_count,
               COALESCE(SUM(b.amount), 0)::text as auction_volume
        FROM ponder_live.auction_bids b
        INNER JOIN ponder_live.auctions a
          ON b.noun_id = a.noun_id AND b.bidder = a.winner AND b.amount = a.amount
        WHERE a.settled = true AND b.client_id IS NOT NULL
        GROUP BY b.client_id
      `,
      // Bid counts per client (all bids, not just winning)
      sql`
        SELECT client_id, COUNT(*)::int as bid_count,
               COALESCE(SUM(amount), 0)::text as bid_volume
        FROM ponder_live.auction_bids
        WHERE client_id IS NOT NULL
        GROUP BY client_id
      `,
      // Accurate total rewarded from append-only event table
      sql`
        SELECT client_id, COALESCE(SUM(amount), 0)::text as total_rewarded
        FROM ponder_live.client_reward_events
        GROUP BY client_id
      `,
      // Accurate total withdrawn from append-only event table
      sql`
        SELECT client_id, COALESCE(SUM(amount), 0)::text as total_withdrawn
        FROM ponder_live.client_withdrawals
        GROUP BY client_id
      `,
    ]);

    // Build lookup maps
    const voteMap = new Map(voteCounts.map((r: any) => [r.client_id, r.vote_count]));
    const proposalMap = new Map(proposalCounts.map((r: any) => [r.client_id, r.proposal_count]));
    const auctionMap = new Map(auctionCounts.map((r: any) => [r.client_id, { count: r.auction_count, volume: r.auction_volume }]));
    const bidMap = new Map(bidCounts.map((r: any) => [r.client_id, { count: r.bid_count, volume: r.bid_volume }]));
    const rewardMap = new Map(rewardSums.map((r: any) => [r.client_id, r.total_rewarded]));
    const withdrawalMap = new Map(withdrawalSums.map((r: any) => [r.client_id, r.total_withdrawn]));

    const clients = clientRows.map((c: any) => {
      const clientId = c.client_id;
      // Use curated display name, fall back to on-chain name, then generic fallback
      const displayName = CLIENT_NAMES[clientId] ?? (c.name || `Client ${clientId}`);

      return {
        clientId,
        name: displayName,
        description: c.description,
        approved: c.approved,
        totalRewarded: rewardMap.get(clientId) ?? '0',
        totalWithdrawn: withdrawalMap.get(clientId) ?? '0',
        blockTimestamp: c.block_timestamp,
        voteCount: voteMap.get(clientId) ?? 0,
        proposalCount: proposalMap.get(clientId) ?? 0,
        auctionCount: auctionMap.get(clientId)?.count ?? 0,
        auctionVolume: auctionMap.get(clientId)?.volume ?? '0',
        bidCount: bidMap.get(clientId)?.count ?? 0,
        bidVolume: bidMap.get(clientId)?.volume ?? '0',
      };
    });

    return NextResponse.json({ clients });
  } catch (error) {
    console.error('[API] Failed to fetch clients:', error);
    return NextResponse.json({ error: 'Failed to fetch clients' }, { status: 500 });
  }
}
