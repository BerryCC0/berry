/**
 * Single Candidate API Route
 * Queries ponder_live for candidate detail with signatures and feedback
 */

import { NextRequest, NextResponse } from 'next/server';
import { ponderSql } from '@/app/lib/ponder-db';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;

  try {
    const sql = ponderSql();

    // Fetch candidate, signatures, and feedback in parallel
    const [candidateRows, sigRows, fbRows, versionRows] = await Promise.all([
      sql`
        SELECT c.id, c.slug, c.proposer, c.title, c.description,
               c.targets, c."values", c.signatures AS signatures_list, c.calldatas,
               c.encoded_proposal_hash, c.proposal_id_to_update,
               c.canceled, c.signature_count,
               c.created_timestamp, c.last_updated_timestamp, c.block_number,
               e.name as proposer_ens
        FROM ponder_live.candidates c
        LEFT JOIN ponder_live.ens_names e ON LOWER(c.proposer) = LOWER(e.address)
        WHERE c.id = ${id}
      `,
      sql`
        SELECT cs.id, cs.signer, cs.sig, cs.expiration_timestamp, cs.reason,
               cs.block_timestamp,
               e.name as signer_ens
        FROM ponder_live.candidate_signatures cs
        LEFT JOIN ponder_live.ens_names e ON LOWER(cs.signer) = LOWER(e.address)
        WHERE cs.candidate_id = ${id}
        ORDER BY cs.block_timestamp DESC
      `,
      sql`
        SELECT cf.id, cf.msg_sender, cf.support, cf.reason, cf.block_timestamp,
               e.name as sender_ens
        FROM ponder_live.candidate_feedback cf
        LEFT JOIN ponder_live.ens_names e ON LOWER(cf.msg_sender) = LOWER(e.address)
        WHERE cf.candidate_id = ${id}
        ORDER BY cf.block_timestamp DESC
        LIMIT 100
      `,
      sql`
        SELECT id, candidate_id, version_number, title, description,
               update_message, block_timestamp
        FROM ponder_live.candidate_versions
        WHERE candidate_id = ${id}
        ORDER BY block_timestamp DESC
      `,
    ]);

    if (candidateRows.length === 0) {
      return NextResponse.json({ error: 'Candidate not found' }, { status: 404 });
    }

    const candidate = candidateRows[0];

    return NextResponse.json({
      candidate: {
        ...candidate,
        signatures: sigRows,
        feedback: fbRows,
        versions: versionRows,
      },
    });
  } catch (error) {
    console.error('Failed to fetch candidate:', error);
    return NextResponse.json({ error: 'Failed to fetch candidate' }, { status: 500 });
  }
}
