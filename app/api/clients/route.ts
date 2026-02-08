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
    // total_rewarded/total_withdrawn are synced from on-chain clientMetadata() by Ponder
    const [clientRows, voteCounts, proposalCounts, auctionCounts, bidCounts] = await Promise.all([
      // All registered clients with on-chain-synced reward/withdrawal totals
      sql`
        SELECT client_id, name, description, approved,
               total_rewarded::text as total_rewarded,
               total_withdrawn::text as total_withdrawn,
               nft_image,
               block_timestamp::text as block_timestamp
        FROM ponder_live.clients
        ORDER BY client_id ASC
      `,
      // Vote weight per client -- SUM(votes) gives total noun-votes, not just vote records
      // Each vote record stores the voter's noun count (vote weight) at time of voting
      sql`
        SELECT client_id, COALESCE(SUM(votes), 0)::int as vote_count
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
    ]);

    // Build lookup maps
    const voteMap = new Map(voteCounts.map((r: any) => [r.client_id, r.vote_count]));
    const proposalMap = new Map(proposalCounts.map((r: any) => [r.client_id, r.proposal_count]));
    const auctionMap = new Map(auctionCounts.map((r: any) => [r.client_id, { count: r.auction_count, volume: r.auction_volume }]));
    const bidMap = new Map(bidCounts.map((r: any) => [r.client_id, { count: r.bid_count, volume: r.bid_volume }]));

    const clients = clientRows.map((c: any) => {
      const clientId = c.client_id;
      // Use curated display name, fall back to on-chain name, then generic fallback
      const displayName = CLIENT_NAMES[clientId] ?? (c.name || `Client ${clientId}`);

      return {
        clientId,
        name: displayName,
        description: c.description,
        approved: c.approved,
        totalRewarded: c.total_rewarded ?? '0',
        totalWithdrawn: c.total_withdrawn ?? '0',
        nftImage: c.nft_image ?? null,
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
