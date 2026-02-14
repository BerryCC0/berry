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
               v.client_id, v.block_timestamp, p.title as proposal_title,
               e.name as voter_ens
        FROM ponder_live.votes v
        LEFT JOIN ponder_live.proposals p ON v.proposal_id = p.id
        LEFT JOIN ponder_live.ens_names e ON LOWER(v.voter) = LOWER(e.address)
        WHERE v.block_timestamp >= ${since}
        ORDER BY v.block_timestamp DESC
        LIMIT ${limit}
      `,
      // Proposal feedback
      sql`
        SELECT pf.id, pf.msg_sender, pf.proposal_id, pf.support, pf.reason,
               pf.block_timestamp, p.title as proposal_title,
               e.name as sender_ens
        FROM ponder_live.proposal_feedback pf
        LEFT JOIN ponder_live.proposals p ON pf.proposal_id = p.id
        LEFT JOIN ponder_live.ens_names e ON LOWER(pf.msg_sender) = LOWER(e.address)
        WHERE pf.block_timestamp >= ${since}
        ORDER BY pf.block_timestamp DESC
        LIMIT ${limit}
      `,
      // Proposals created
      sql`
        SELECT p.id, p.title, p.proposer, p.created_timestamp, p.start_block, p.end_block,
               p.start_timestamp, p.end_timestamp,
               p.status, p.for_votes, p.against_votes, p.quorum_votes, p.client_id,
               p.cancelled_timestamp, p.queued_timestamp, p.executed_timestamp, p.vetoed_timestamp,
               e.name as proposer_ens
        FROM ponder_live.proposals p
        LEFT JOIN ponder_live.ens_names e ON LOWER(p.proposer) = LOWER(e.address)
        WHERE p.created_timestamp >= ${since}
        ORDER BY p.created_timestamp DESC
        LIMIT ${limit}
      `,
      // Candidates created
      sql`
        SELECT c.id, c.proposer, c.slug, c.title, c.created_timestamp,
               e.name as proposer_ens
        FROM ponder_live.candidates c
        LEFT JOIN ponder_live.ens_names e ON LOWER(c.proposer) = LOWER(e.address)
        WHERE c.canceled = false AND c.created_timestamp >= ${since}
        ORDER BY c.created_timestamp DESC
        LIMIT ${limit}
      `,
      // Candidate feedback
      sql`
        SELECT cf.id, cf.msg_sender, cf.candidate_id, cf.support, cf.reason,
               cf.block_timestamp, c.slug as candidate_slug, c.proposer as candidate_proposer,
               c.title as candidate_title,
               e.name as sender_ens
        FROM ponder_live.candidate_feedback cf
        LEFT JOIN ponder_live.candidates c ON cf.candidate_id = c.id
        LEFT JOIN ponder_live.ens_names e ON LOWER(cf.msg_sender) = LOWER(e.address)
        WHERE cf.block_timestamp >= ${since}
        ORDER BY cf.block_timestamp DESC
        LIMIT ${limit}
      `,
      // Candidate signatures (sponsorships)
      sql`
        SELECT cs.id, cs.signer, cs.candidate_id, cs.reason, cs.block_timestamp,
               c.slug as candidate_slug, c.proposer as candidate_proposer,
               c.title as candidate_title,
               e.name as signer_ens
        FROM ponder_live.candidate_signatures cs
        LEFT JOIN ponder_live.candidates c ON cs.candidate_id = c.id
        LEFT JOIN ponder_live.ens_names e ON LOWER(cs.signer) = LOWER(e.address)
        WHERE cs.block_timestamp >= ${since}
        ORDER BY cs.block_timestamp DESC
        LIMIT ${limit}
      `,
      // Transfers (exclude mints, auction settlements, and treasury-to-auction)
      sql`
        SELECT t.id, t."from", t."to", t.token_id, t.block_timestamp, t.tx_hash,
               ef.name as from_ens,
               et.name as to_ens
        FROM ponder_live.transfers t
        LEFT JOIN ponder_live.ens_names ef ON LOWER(t."from") = LOWER(ef.address)
        LEFT JOIN ponder_live.ens_names et ON LOWER(t."to") = LOWER(et.address)
        WHERE t.block_timestamp >= ${since}
          AND t."from" != '0x0000000000000000000000000000000000000000'
          AND t."from" != '0x830bd73e4184cef73443c15111a1df14e495c706'
          AND t."to" != '0x0000000000000000000000000000000000000000'
          AND NOT (t."from" = '0xb1a32FC9F9D8b2cf86C068Cae13108809547ef71' AND t."to" = '0x830bd73e4184cef73443c15111a1df14e495c706')
        ORDER BY t.block_timestamp DESC
        LIMIT ${limit}
      `,
      // Delegations (with noun IDs owned by delegator)
      sql`
        SELECT d.id, d.delegator, d.from_delegate, d.to_delegate, d.block_timestamp,
               COALESCE(
                 (SELECT json_agg(n.id ORDER BY n.id)
                  FROM ponder_live.nouns n
                  WHERE n.owner = d.delegator),
                 '[]'::json
               ) AS noun_ids,
               ed.name as delegator_ens,
               et.name as to_delegate_ens
        FROM ponder_live.delegations d
        LEFT JOIN ponder_live.ens_names ed ON LOWER(d.delegator) = LOWER(ed.address)
        LEFT JOIN ponder_live.ens_names et ON LOWER(d.to_delegate) = LOWER(et.address)
        WHERE d.block_timestamp >= ${since}
          AND d.from_delegate != d.to_delegate
        ORDER BY d.block_timestamp DESC
        LIMIT ${limit}
      `,
      // Auctions (join nouns to get correct settler — the person who chose this noun's appearance)
      sql`
        SELECT a.noun_id, a.start_time, a.end_time, a.winner, a.amount, a.settled,
               n.settled_by_address AS noun_settler_address,
               ew.name as winner_ens,
               es.name as settler_ens
        FROM ponder_live.auctions a
        LEFT JOIN ponder_live.nouns n ON a.noun_id = n.id
        LEFT JOIN ponder_live.ens_names ew ON LOWER(a.winner) = LOWER(ew.address)
        LEFT JOIN ponder_live.ens_names es ON LOWER(n.settled_by_address) = LOWER(es.address)
        WHERE a.start_time >= ${since}
        ORDER BY a.start_time DESC
        LIMIT ${limit}
      `,
      // Proposal versions (updates)
      sql`
        SELECT pv.id, pv.proposal_id, pv.title, pv.update_message,
               pv.block_timestamp, p.title as proposal_title, p.proposer,
               e.name as proposer_ens
        FROM ponder_live.proposal_versions pv
        LEFT JOIN ponder_live.proposals p ON pv.proposal_id = p.id
        LEFT JOIN ponder_live.ens_names e ON LOWER(p.proposer) = LOWER(e.address)
        WHERE pv.block_timestamp >= ${since}
        ORDER BY pv.block_timestamp DESC
        LIMIT ${limit}
      `,
      // Candidate versions (updates)
      sql`
        SELECT cv.id, cv.candidate_id, cv.title, cv.update_message,
               cv.block_timestamp, c.slug as candidate_slug, c.proposer as candidate_proposer,
               e.name as proposer_ens
        FROM ponder_live.candidate_versions cv
        LEFT JOIN ponder_live.candidates c ON cv.candidate_id = c.id
        LEFT JOIN ponder_live.ens_names e ON LOWER(c.proposer) = LOWER(e.address)
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
