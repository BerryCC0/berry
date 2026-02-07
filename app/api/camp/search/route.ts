/**
 * Camp Search API
 * Provides partial text search across voters, proposals, and candidates
 *
 * Queries Ponder's ponder_live schema
 *
 * GET /api/camp/search?q=mike&type=voters,proposals,candidates
 */

import { NextRequest, NextResponse } from 'next/server';
import { ponderSql } from '@/app/lib/ponder-db';

interface SearchResults {
  voters: any[];
  proposals: any[];
  candidates: any[];
  query: string;
  types: string[];
}

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const query = searchParams.get('q')?.trim() || '';
  const typesParam = searchParams.get('type') || 'voters,proposals,candidates';
  const types = typesParam.split(',').map(t => t.trim().toLowerCase());
  const limit = Math.min(parseInt(searchParams.get('limit') || '10'), 20);

  // Require at least 2 characters for search
  if (query.length < 2) {
    return NextResponse.json({
      voters: [],
      proposals: [],
      candidates: [],
      query,
      types,
    });
  }

  try {
    const sql = ponderSql();
    const results: SearchResults = {
      voters: [],
      proposals: [],
      candidates: [],
      query,
      types,
    };

    const searchPattern = `%${query.toLowerCase()}%`;

    // Search voters (by address)
    if (types.includes('voters')) {
      try {
        results.voters = await sql`
          SELECT address, delegated_votes, total_votes
          FROM ponder_live.voters
          WHERE LOWER(address) LIKE ${searchPattern}
          ORDER BY delegated_votes DESC
          LIMIT ${limit}
        `;
      } catch (error) {
        console.error('[Search] Error searching voters:', error);
      }
    }

    // Search proposals (by title or ID)
    if (types.includes('proposals')) {
      try {
        const isNumeric = /^\d+$/.test(query);

        if (isNumeric) {
          results.proposals = await sql`
            SELECT id, title, status, proposer, for_votes, against_votes, abstain_votes
            FROM ponder_live.proposals
            WHERE id = ${parseInt(query)}
               OR LOWER(title) LIKE ${searchPattern}
            ORDER BY created_timestamp DESC
            LIMIT ${limit}
          `;
        } else {
          results.proposals = await sql`
            SELECT id, title, status, proposer, for_votes, against_votes, abstain_votes
            FROM ponder_live.proposals
            WHERE LOWER(title) LIKE ${searchPattern}
            ORDER BY created_timestamp DESC
            LIMIT ${limit}
          `;
        }
      } catch (error) {
        console.error('[Search] Error searching proposals:', error);
      }
    }

    // Search candidates (by title or slug)
    if (types.includes('candidates')) {
      try {
        results.candidates = await sql`
          SELECT id, slug, title, proposer, canceled, signature_count
          FROM ponder_live.candidates
          WHERE canceled = false
            AND (LOWER(title) LIKE ${searchPattern} OR LOWER(slug) LIKE ${searchPattern})
          ORDER BY created_timestamp DESC
          LIMIT ${limit}
        `;
      } catch (error) {
        console.error('[Search] Error searching candidates:', error);
      }
    }

    return NextResponse.json(results);
  } catch (error) {
    console.error('[Search] Error:', error);
    return NextResponse.json(
      { error: 'Search failed', details: String(error) },
      { status: 500 }
    );
  }
}
