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
        SELECT c.id, c.slug, c.proposer, c.title, c.description,
               c.targets, c."values", c.signatures AS signatures_list, c.calldatas,
               c.encoded_proposal_hash, c.proposal_id_to_update,
               c.created_timestamp, c.last_updated_timestamp, c.canceled,
               c.signature_count,
               e.name as proposer_ens
        FROM ponder_live.candidates c
        LEFT JOIN ponder_live.ens_names e ON LOWER(c.proposer) = LOWER(e.address)
        WHERE c.slug = ${slug}
        LIMIT 1
      `;
      if (rows.length === 0) {
        return NextResponse.json({ error: 'Candidate not found' }, { status: 404 });
      }

      // Fetch signatures and feedback for the found candidate
      const candidate = rows[0];
      const [sigRows, fbRows] = await Promise.all([
        sql`
          SELECT cs.id, cs.signer, cs.sig, cs.expiration_timestamp, cs.reason,
                 cs.block_timestamp,
                 e.name as signer_ens
          FROM ponder_live.candidate_signatures cs
          LEFT JOIN ponder_live.ens_names e ON LOWER(cs.signer) = LOWER(e.address)
          WHERE cs.candidate_id = ${candidate.id}
          ORDER BY cs.block_timestamp DESC
        `,
        sql`
          SELECT cf.id, cf.msg_sender, cf.support, cf.reason, cf.block_timestamp,
                 e.name as sender_ens
          FROM ponder_live.candidate_feedback cf
          LEFT JOIN ponder_live.ens_names e ON LOWER(cf.msg_sender) = LOWER(e.address)
          WHERE cf.candidate_id = ${candidate.id}
          ORDER BY cf.block_timestamp DESC
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
      SELECT c.id, c.slug, c.proposer, c.title, c.description,
             c.created_timestamp, c.last_updated_timestamp, c.canceled,
             c.signature_count,
             e.name as proposer_ens
      FROM ponder_live.candidates c
      LEFT JOIN ponder_live.ens_names e ON LOWER(c.proposer) = LOWER(e.address)
      WHERE c.canceled = false
      ORDER BY c.created_timestamp DESC NULLS LAST
      LIMIT ${limit} OFFSET ${offset}
    `;

    return NextResponse.json({ candidates: rows });
  } catch (error) {
    console.error('Failed to fetch candidates:', error);
    return NextResponse.json({ error: 'Failed to fetch candidates' }, { status: 500 });
  }
}
