/**
 * Single Proposal API Route
 * Queries ponder_live for full proposal detail with votes and feedback
 */

import { NextRequest, NextResponse } from 'next/server';
import { ponderSql } from '@/app/lib/ponder-db';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const proposalId = parseInt(id);

  if (isNaN(proposalId)) {
    return NextResponse.json({ error: 'Invalid proposal ID' }, { status: 400 });
  }

  try {
    const sql = ponderSql();

    // Fetch proposal, votes, and feedback in parallel
    const [proposalRows, voteRows, feedbackRows, versionRows] = await Promise.all([
      sql`
        SELECT id, proposer, title, description, status,
               targets, "values", signatures, calldatas,
               start_block, end_block, proposal_threshold, quorum_votes,
               for_votes, against_votes, abstain_votes,
               execution_eta, signers, update_period_end_block,
               objection_period_end_block, on_timelock_v_1,
               client_id, created_timestamp, created_block, tx_hash
        FROM ponder_live.proposals
        WHERE id = ${proposalId}
      `,
      sql`
        SELECT id, voter, proposal_id, support, votes,
               reason, client_id, block_number, block_timestamp, tx_hash
        FROM ponder_live.votes
        WHERE proposal_id = ${proposalId}
        ORDER BY votes DESC
        LIMIT 500
      `,
      sql`
        SELECT id, msg_sender, proposal_id, support, reason,
               block_number, block_timestamp
        FROM ponder_live.proposal_feedback
        WHERE proposal_id = ${proposalId}
        ORDER BY block_timestamp DESC
        LIMIT 100
      `,
      sql`
        SELECT id, proposal_id, version_number, title, description,
               update_message, block_number, block_timestamp
        FROM ponder_live.proposal_versions
        WHERE proposal_id = ${proposalId}
        ORDER BY block_timestamp DESC
      `,
    ]);

    if (proposalRows.length === 0) {
      return NextResponse.json({ error: 'Proposal not found' }, { status: 404 });
    }

    const proposal = proposalRows[0];

    return NextResponse.json({
      proposal: {
        ...proposal,
        votes: voteRows,
        feedback: feedbackRows,
        versions: versionRows,
      },
    });
  } catch (error) {
    console.error('Failed to fetch proposal:', error);
    return NextResponse.json({ error: 'Failed to fetch proposal' }, { status: 500 });
  }
}
