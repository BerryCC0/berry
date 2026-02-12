/**
 * Candidates API Route
 * Queries ponder_live.candidates
 */

import { NextRequest, NextResponse } from 'next/server';
import { ponderSql } from '@/app/lib/ponder-db';

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const limit = Math.min(parseInt(searchParams.get('limit') || '20'), 100);
  const offset = parseInt(searchParams.get('offset') || '0');
  const slug = searchParams.get('slug');

  try {
    const sql = ponderSql();

    // If slug is provided, find by slug (for clean URL resolution)
    if (slug) {
      const rows = await sql`
        SELECT id, slug, proposer, title, description,
               targets, "values", signatures AS signatures_list, calldatas,
               encoded_proposal_hash, proposal_id_to_update,
               created_timestamp, last_updated_timestamp, canceled,
               signature_count
        FROM ponder_live.candidates
        WHERE slug = ${slug}
        LIMIT 1
      `;
      if (rows.length === 0) {
        return NextResponse.json({ error: 'Candidate not found' }, { status: 404 });
      }

      // Fetch signatures and feedback for the found candidate
      const candidate = rows[0];
      const [sigRows, fbRows] = await Promise.all([
        sql`
          SELECT id, signer, sig, expiration_timestamp, reason,
                 block_timestamp
          FROM ponder_live.candidate_signatures
          WHERE candidate_id = ${candidate.id}
          ORDER BY block_timestamp DESC
        `,
        sql`
          SELECT id, msg_sender, support, reason, block_timestamp
          FROM ponder_live.candidate_feedback
          WHERE candidate_id = ${candidate.id}
          ORDER BY block_timestamp DESC
          LIMIT 100
        `,
      ]);

      return NextResponse.json({
        candidate: {
          ...candidate,
          signatures: sigRows,
          feedback: fbRows,
        },
      });
    }

    // List candidates
    const rows = await sql`
      SELECT id, slug, proposer, title, description,
             created_timestamp, last_updated_timestamp, canceled,
             signature_count
      FROM ponder_live.candidates
      WHERE canceled = false
      ORDER BY created_timestamp DESC NULLS LAST
      LIMIT ${limit} OFFSET ${offset}
    `;

    return NextResponse.json({ candidates: rows });
  } catch (error) {
    console.error('Failed to fetch candidates:', error);
    return NextResponse.json({ error: 'Failed to fetch candidates' }, { status: 500 });
  }
}
