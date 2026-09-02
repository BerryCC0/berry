/**
 * Candidates API Route
 * Queries ponder_live.candidates
 */

import { NextRequest, NextResponse } from 'next/server';
import { ponderSql } from '@/app/lib/ponder-db';
import { getCandidateVersions } from '@/app/lib/candidateVersions';
import { deriveTitleFromDescription } from '@/OS/Apps/nouns/Camp/utils/descriptionUtils';

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const limit = Math.min(parseInt(searchParams.get('limit') || '20'), 100);
  const offset = parseInt(searchParams.get('offset') || '0');
  const slug = searchParams.get('slug');

  try {
    const sql = ponderSql();

    // If slug is provided, find by slug (for clean URL resolution)
    if (slug) {
      // Slugs are not unique across proposers (21 collisions currently in
      // the indexer — e.g. `fund-usdc-buyer-contract` has 3 rows). When a
      // clean `/c/{slug}` URL is resolved, prefer the newest non-canceled
      // candidate so users don't land on a stale/canceled collision.
      //
      // Candidates whose on-chain slug ends with `?` (a real thing — e.g.
      // "Should Nouns simulate proposals before funding?") lose the `?` when
      // shared as a bare URL because the browser treats it as the query-
      // separator. If the exact-match lookup misses AND the slug doesn't
      // already end in `?`, we fall back to trying `slug + '?'`. Safe: if
      // both `foo` and `foo?` exist, `foo` wins on the first try; if only
      // `foo?` exists, the fallback finds it.
      let rows = await sql`
        SELECT c.id, c.slug, c.proposer, c.title, c.description,
               c.targets, c."values", c.signatures AS signatures_list, c.calldatas,
               c.encoded_proposal_hash, c.proposal_id_to_update,
               c.created_timestamp, c.last_updated_timestamp, c.canceled,
               c.signature_count,
               e.name as proposer_ens
        FROM ponder_live.candidates c
        LEFT JOIN ponder_live.ens_names e ON LOWER(c.proposer) = LOWER(e.address)
        WHERE c.slug = ${slug}
        ORDER BY c.canceled ASC, c.created_timestamp DESC NULLS LAST
        LIMIT 1
      `;
      if (rows.length === 0 && !slug.endsWith('?')) {
        rows = await sql`
          SELECT c.id, c.slug, c.proposer, c.title, c.description,
                 c.targets, c."values", c.signatures AS signatures_list, c.calldatas,
                 c.encoded_proposal_hash, c.proposal_id_to_update,
                 c.created_timestamp, c.last_updated_timestamp, c.canceled,
                 c.signature_count,
                 e.name as proposer_ens
          FROM ponder_live.candidates c
          LEFT JOIN ponder_live.ens_names e ON LOWER(c.proposer) = LOWER(e.address)
          WHERE c.slug = ${slug + '?'}
          ORDER BY c.canceled ASC, c.created_timestamp DESC NULLS LAST
          LIMIT 1
        `;
      }
      if (rows.length === 0) {
        return NextResponse.json({ error: 'Candidate not found' }, { status: 404 });
      }

      // Match the full-ID detail route, including complete version history.
      const candidate = rows[0];
      const [sigRows, fbRows, versionRows] = await Promise.all([
        sql`
          SELECT cs.id, cs.signer, cs.sig, cs.expiration_timestamp, cs.reason,
                 cs.block_timestamp, cs.encoded_prop_hash,
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
        getCandidateVersions(sql, candidate.id),
      ]);

      // Backfill empty title from the description body (see proposals route).
      if (!candidate.title) {
        candidate.title = deriveTitleFromDescription(candidate.description);
      }

      return NextResponse.json({
        candidate: {
          ...candidate,
          signatures: sigRows,
          feedback: fbRows,
          versions: versionRows,
        },
      });
    }

    // List candidates. Exclude any that have already been promoted to a
    // proposal — the promotion is surfaced on the promoted proposal instead.
    const rows = await sql`
      SELECT c.id, c.slug, c.proposer, c.title, c.description,
             c.created_timestamp, c.last_updated_timestamp, c.canceled,
             c.signature_count,
             e.name as proposer_ens
      FROM ponder_live.candidates c
      LEFT JOIN ponder_live.ens_names e ON LOWER(c.proposer) = LOWER(e.address)
      WHERE c.canceled = false
        AND NOT EXISTS (
          SELECT 1 FROM ponder_live.proposals p
          WHERE p.encoded_proposal_hash IS NOT NULL
            AND p.encoded_proposal_hash = c.encoded_proposal_hash
        )
      ORDER BY c.created_timestamp DESC NULLS LAST
      LIMIT ${limit} OFFSET ${offset}
    `;

    // Backfill empty titles across the list (see proposals route).
    const candidates = rows.map((r) =>
      r.title
        ? r
        : { ...r, title: deriveTitleFromDescription(r.description) },
    );

    return NextResponse.json({ candidates });
  } catch (error) {
    console.error('Failed to fetch candidates:', error);
    return NextResponse.json({ error: 'Failed to fetch candidates' }, { status: 500 });
  }
}
