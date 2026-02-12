/**
 * Activity Feed API Route
 * Queries ponder_live tables for unified activity data
 */

import { NextRequest, NextResponse } from 'next/server';
import { ponderSql } from '@/app/lib/ponder-db';

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const limit = Math.min(parseInt(searchParams.get('limit') || '30'), 100);
  const since = searchParams.get('since') || String(Math.floor(Date.now() / 1000) - 14 * 24 * 60 * 60);

  try {
    const sql = ponderSql();

    // Fetch all activity types in parallel
    const [voteRows, feedbackRows, proposalRows, candidateRows, candidateFbRows,
           signatureRows, transferRows, delegationRows, auctionRows, proposalVersionRows,
           candidateVersionRows] = await Promise.all([
      // Votes
      sql`
        SELECT v.id, v.voter, v.proposal_id, v.support, v.votes, v.reason,
               v.client_id, v.block_timestamp, p.title as proposal_title
        FROM ponder_live.votes v
        LEFT JOIN ponder_live.proposals p ON v.proposal_id = p.id
        WHERE v.block_timestamp >= ${since}
        ORDER BY v.block_timestamp DESC
        LIMIT ${limit}
      `,
      // Proposal feedback
      sql`
        SELECT pf.id, pf.msg_sender, pf.proposal_id, pf.support, pf.reason,
               pf.block_timestamp, p.title as proposal_title
        FROM ponder_live.proposal_feedback pf
        LEFT JOIN ponder_live.proposals p ON pf.proposal_id = p.id
        WHERE pf.block_timestamp >= ${since}
        ORDER BY pf.block_timestamp DESC
        LIMIT ${limit}
      `,
      // Proposals created
      sql`
        SELECT id, title, proposer, created_timestamp, start_block, end_block,
               status, for_votes, against_votes, quorum_votes, client_id
        FROM ponder_live.proposals
        WHERE created_timestamp >= ${since}
        ORDER BY created_timestamp DESC
        LIMIT ${limit}
      `,
      // Candidates created
      sql`
        SELECT id, proposer, slug, title, created_timestamp
        FROM ponder_live.candidates
        WHERE canceled = false AND created_timestamp >= ${since}
        ORDER BY created_timestamp DESC
        LIMIT ${limit}
      `,
      // Candidate feedback
      sql`
        SELECT cf.id, cf.msg_sender, cf.candidate_id, cf.support, cf.reason,
               cf.block_timestamp, c.slug as candidate_slug, c.proposer as candidate_proposer,
               c.title as candidate_title
        FROM ponder_live.candidate_feedback cf
        LEFT JOIN ponder_live.candidates c ON cf.candidate_id = c.id
        WHERE cf.block_timestamp >= ${since}
        ORDER BY cf.block_timestamp DESC
        LIMIT ${limit}
      `,
      // Candidate signatures (sponsorships)
      sql`
        SELECT cs.id, cs.signer, cs.candidate_id, cs.reason, cs.block_timestamp,
               c.slug as candidate_slug, c.proposer as candidate_proposer,
               c.title as candidate_title
        FROM ponder_live.candidate_signatures cs
        LEFT JOIN ponder_live.candidates c ON cs.candidate_id = c.id
        WHERE cs.block_timestamp >= ${since}
        ORDER BY cs.block_timestamp DESC
        LIMIT ${limit}
      `,
      // Transfers (exclude mints and auction settlements)
      sql`
        SELECT id, "from", "to", token_id, block_timestamp, tx_hash
        FROM ponder_live.transfers
        WHERE block_timestamp >= ${since}
          AND "from" != '0x0000000000000000000000000000000000000000'
          AND "from" != '0x830bd73e4184cef73443c15111a1df14e495c706'
          AND "to" != '0x0000000000000000000000000000000000000000'
        ORDER BY block_timestamp DESC
        LIMIT ${limit}
      `,
      // Delegations
      sql`
        SELECT id, delegator, from_delegate, to_delegate, block_timestamp
        FROM ponder_live.delegations
        WHERE block_timestamp >= ${since}
          AND from_delegate != to_delegate
        ORDER BY block_timestamp DESC
        LIMIT ${limit}
      `,
      // Auctions
      sql`
        SELECT noun_id, start_time, end_time, winner, amount, settled, settler_address
        FROM ponder_live.auctions
        WHERE start_time >= ${since}
        ORDER BY start_time DESC
        LIMIT ${limit}
      `,
      // Proposal versions (updates)
      sql`
        SELECT pv.id, pv.proposal_id, pv.title, pv.update_message,
               pv.block_timestamp, p.title as proposal_title, p.proposer
        FROM ponder_live.proposal_versions pv
        LEFT JOIN ponder_live.proposals p ON pv.proposal_id = p.id
        WHERE pv.block_timestamp >= ${since}
        ORDER BY pv.block_timestamp DESC
        LIMIT ${limit}
      `,
      // Candidate versions (updates)
      sql`
        SELECT cv.id, cv.candidate_id, cv.title, cv.update_message,
               cv.block_timestamp, c.slug as candidate_slug, c.proposer as candidate_proposer
        FROM ponder_live.candidate_versions cv
        LEFT JOIN ponder_live.candidates c ON cv.candidate_id = c.id
        WHERE cv.block_timestamp >= ${since}
        ORDER BY cv.block_timestamp DESC
        LIMIT ${limit}
      `,
    ]);

    return NextResponse.json({
      votes: voteRows,
      proposalFeedback: feedbackRows,
      proposals: proposalRows,
      candidates: candidateRows,
      candidateFeedback: candidateFbRows,
      candidateSignatures: signatureRows,
      transfers: transferRows,
      delegations: delegationRows,
      auctions: auctionRows,
      proposalVersions: proposalVersionRows,
      candidateVersions: candidateVersionRows,
    });
  } catch (error) {
    console.error('Failed to fetch activity:', error);
    return NextResponse.json({ error: 'Failed to fetch activity' }, { status: 500 });
  }
}
