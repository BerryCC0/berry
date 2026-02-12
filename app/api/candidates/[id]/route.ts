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
        SELECT id, slug, proposer, title, description,
               targets, "values", signatures AS signatures_list, calldatas,
               encoded_proposal_hash, proposal_id_to_update,
               canceled, signature_count,
               created_timestamp, last_updated_timestamp, block_number
        FROM ponder_live.candidates
        WHERE id = ${id}
      `,
      sql`
        SELECT id, signer, sig, expiration_timestamp, reason,
               block_timestamp
        FROM ponder_live.candidate_signatures
        WHERE candidate_id = ${id}
        ORDER BY block_timestamp DESC
      `,
      sql`
        SELECT id, msg_sender, support, reason, block_timestamp
        FROM ponder_live.candidate_feedback
        WHERE candidate_id = ${id}
        ORDER BY block_timestamp DESC
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
