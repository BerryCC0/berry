/**
 * Nouns List API Route
 * GET /api/nouns - List all cached Nouns
 */

import { NextRequest, NextResponse } from 'next/server';
import { neon } from '@neondatabase/serverless';

// Note: Nouns lib is at app/lib/nouns - import if needed

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  
  // Pagination
  const limitParam = parseInt(searchParams.get('limit') || '50');
  const limit = Math.min(Math.max(1, limitParam), 100); // Clamp between 1-100
  const offset = Math.max(0, parseInt(searchParams.get('offset') || '0'));
  
  // Optional filters
  const settler = searchParams.get('settler')?.toLowerCase();
  const winner = searchParams.get('winner')?.toLowerCase();
  
  try {
    const sql = neon(process.env.DATABASE_URL!);
    
    let nouns;
    
    if (settler) {
      nouns = await sql`
        SELECT id, background, body, accessory, head, glasses,
               settled_by_address, settled_by_ens, settled_at,
               winning_bid, winner_address, winner_ens
        FROM nouns
        WHERE LOWER(settled_by_address) = ${settler}
        ORDER BY id DESC
        LIMIT ${limit} OFFSET ${offset}
      `;
    } else if (winner) {
      nouns = await sql`
        SELECT id, background, body, accessory, head, glasses,
               settled_by_address, settled_by_ens, settled_at,
               winning_bid, winner_address, winner_ens
        FROM nouns
        WHERE LOWER(winner_address) = ${winner}
        ORDER BY id DESC
        LIMIT ${limit} OFFSET ${offset}
      `;
    } else {
      nouns = await sql`
        SELECT id, background, body, accessory, head, glasses,
               settled_by_address, settled_by_ens, settled_at,
               winning_bid, winner_address, winner_ens
        FROM nouns
        ORDER BY id DESC
        LIMIT ${limit} OFFSET ${offset}
      `;
    }
    
    // Get total count
    const countResult = await sql`SELECT COUNT(*) as count FROM nouns`;
    const total = parseInt(countResult[0]?.count || '0');
    
    return NextResponse.json({
      nouns,
      total,
      limit,
      offset,
    });
  } catch (error) {
    console.error('[API] Failed to fetch nouns:', error);
    return NextResponse.json(
      { error: 'Failed to fetch nouns' },
      { status: 500 }
    );
  }
}
