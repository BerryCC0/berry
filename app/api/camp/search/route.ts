/**
 * Camp Search API
 * Provides partial text search across voters (with ENS), proposals, and candidates
 * Uses PostgreSQL trigram indexes for efficient ILIKE matching
 * 
 * GET /api/camp/search?q=mike&type=voters,proposals,candidates
 */

import { NextRequest, NextResponse } from 'next/server';
import { neon } from '@neondatabase/serverless';

// Types for search results
interface VoterResult {
  address: string;
  ensName: string | null;
  delegatedVotes: number;
  nounsRepresented: number[];
}

interface ProposalResult {
  id: number;
  title: string;
  status: string;
  proposer: string;
  forVotes: number;
  againstVotes: number;
  abstainVotes: number;
}

interface CandidateResult {
  id: string;
  slug: string;
  title: string | null;
  proposer: string;
  canceled: boolean;
  signatureCount: number;
}

interface SearchResults {
  voters: VoterResult[];
  proposals: ProposalResult[];
  candidates: CandidateResult[];
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
    const sql = neon(process.env.DATABASE_URL!);
    const results: SearchResults = {
      voters: [],
      proposals: [],
      candidates: [],
      query,
      types,
    };

    // Prepare search pattern for ILIKE
    const searchPattern = `%${query.toLowerCase()}%`;

    // Search voters (by ENS name or address)
    if (types.includes('voters')) {
      try {
        const voters = await sql`
          SELECT 
            address,
            ens_name,
            delegated_votes,
            nouns_represented
          FROM legacy_voters
          WHERE 
            LOWER(ens_name) LIKE ${searchPattern}
            OR LOWER(address) LIKE ${searchPattern}
          ORDER BY delegated_votes DESC
          LIMIT ${limit}
        `;
        
        results.voters = voters.map(v => ({
          address: v.address,
          ensName: v.ens_name,
          delegatedVotes: v.delegated_votes,
          nounsRepresented: v.nouns_represented || [],
        }));
      } catch (error) {
        console.error('[Search] Error searching voters:', error);
      }
    }

    // Search proposals (by title or ID)
    if (types.includes('proposals')) {
      try {
        // Check if query is a number (proposal ID)
        const isNumeric = /^\d+$/.test(query);
        
        let proposals;
        if (isNumeric) {
          proposals = await sql`
            SELECT 
              id,
              title,
              status,
              proposer,
              for_votes,
              against_votes,
              abstain_votes
            FROM legacy_proposals
            WHERE 
              id = ${parseInt(query)}
              OR LOWER(title) LIKE ${searchPattern}
            ORDER BY created_timestamp DESC
            LIMIT ${limit}
          `;
        } else {
          proposals = await sql`
            SELECT 
              id,
              title,
              status,
              proposer,
              for_votes,
              against_votes,
              abstain_votes
            FROM legacy_proposals
            WHERE LOWER(title) LIKE ${searchPattern}
            ORDER BY created_timestamp DESC
            LIMIT ${limit}
          `;
        }
        
        results.proposals = proposals.map(p => ({
          id: p.id,
          title: p.title,
          status: p.status,
          proposer: p.proposer,
          forVotes: p.for_votes,
          againstVotes: p.against_votes,
          abstainVotes: p.abstain_votes,
        }));
      } catch (error) {
        console.error('[Search] Error searching proposals:', error);
      }
    }

    // Search candidates (by title or slug)
    if (types.includes('candidates')) {
      try {
        const candidates = await sql`
          SELECT 
            id,
            slug,
            title,
            proposer,
            canceled,
            signature_count
          FROM legacy_candidates
          WHERE 
            canceled = false
            AND (
              LOWER(title) LIKE ${searchPattern}
              OR LOWER(slug) LIKE ${searchPattern}
            )
          ORDER BY created_timestamp DESC
          LIMIT ${limit}
        `;
        
        results.candidates = candidates.map(c => ({
          id: c.id,
          slug: c.slug,
          title: c.title,
          proposer: c.proposer,
          canceled: c.canceled,
          signatureCount: c.signature_count,
        }));
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
