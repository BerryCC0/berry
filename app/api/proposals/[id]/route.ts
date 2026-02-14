/**
 * Single Proposal API Route
 * Queries ponder_live for full proposal detail with votes and feedback
 */

import { NextRequest, NextResponse } from 'next/server';
import { ponderSql } from '@/app/lib/ponder-db';
import { NOUNS_ADDRESSES } from '@/app/lib/nouns/contracts';

// RPC endpoint and contract config for dynamic quorum
const ETH_RPC = 'https://eth.llamarpc.com';
const NOUNS_DAO_ADDRESS = NOUNS_ADDRESSES.governor;
// keccak256("quorumVotes(uint256)") = 0x0f7b1f08
const QUORUM_VOTES_SELECTOR = '0x0f7b1f08';

/**
 * Fetch dynamic quorum for a proposal from the Nouns DAO contract.
 * Returns null if the call fails (falls back to indexed value).
 */
async function fetchDynamicQuorum(proposalId: number): Promise<bigint | null> {
  try {
    const paddedId = BigInt(proposalId).toString(16).padStart(64, '0');
    const callData = QUORUM_VOTES_SELECTOR + paddedId;

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 3000);

    const response = await fetch(ETH_RPC, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        jsonrpc: '2.0',
        method: 'eth_call',
        params: [{ to: NOUNS_DAO_ADDRESS, data: callData }, 'latest'],
        id: 1,
      }),
      signal: controller.signal,
    });

    clearTimeout(timeout);

    const json = await response.json();
    if (json.result && json.result !== '0x') {
      const quorum = BigInt(json.result);
      return quorum;
    }
    return null;
  } catch {
    return null;
  }
}

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

    // Fetch proposal, votes, feedback, and dynamic quorum in parallel
    const [proposalRows, voteRows, feedbackRows, versionRows, dynamicQuorum] = await Promise.all([
      sql`
        SELECT p.id, p.proposer, p.title, p.description, p.status,
               p.targets, p."values", p.signatures, p.calldatas,
               p.start_block, p.end_block, p.start_timestamp, p.end_timestamp,
               p.proposal_threshold, p.quorum_votes,
               p.for_votes, p.against_votes, p.abstain_votes,
               p.execution_eta, p.signers, p.update_period_end_block,
               p.objection_period_end_block, p.on_timelock_v_1,
               p.client_id, p.created_timestamp, p.created_block, p.tx_hash,
               e.name as proposer_ens
        FROM ponder_live.proposals p
        LEFT JOIN ponder_live.ens_names e ON LOWER(p.proposer) = LOWER(e.address)
        WHERE p.id = ${proposalId}
      `,
      sql`
        SELECT v.id, v.voter, v.proposal_id, v.support, v.votes,
               v.reason, v.client_id, v.block_number, v.block_timestamp, v.tx_hash,
               e.name as voter_ens
        FROM ponder_live.votes v
        LEFT JOIN ponder_live.ens_names e ON LOWER(v.voter) = LOWER(e.address)
        WHERE v.proposal_id = ${proposalId}
        ORDER BY v.votes DESC
        LIMIT 500
      `,
      sql`
        SELECT pf.id, pf.msg_sender, pf.proposal_id, pf.support, pf.reason,
               pf.block_number, pf.block_timestamp,
               e.name as sender_ens
        FROM ponder_live.proposal_feedback pf
        LEFT JOIN ponder_live.ens_names e ON LOWER(pf.msg_sender) = LOWER(e.address)
        WHERE pf.proposal_id = ${proposalId}
        ORDER BY pf.block_timestamp DESC
        LIMIT 100
      `,
      sql`
        SELECT id, proposal_id, version_number, title, description,
               update_message, block_number, block_timestamp
        FROM ponder_live.proposal_versions
        WHERE proposal_id = ${proposalId}
        ORDER BY block_timestamp DESC
      `,
      fetchDynamicQuorum(proposalId),
    ]);

    if (proposalRows.length === 0) {
      return NextResponse.json({ error: 'Proposal not found' }, { status: 404 });
    }

    const proposal = proposalRows[0];

    // Override quorum_votes with dynamic on-chain value when available
    if (dynamicQuorum !== null) {
      proposal.quorum_votes = dynamicQuorum.toString();
    }

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
