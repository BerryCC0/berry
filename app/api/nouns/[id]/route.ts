/**
 * Single Noun API Route
 * GET /api/nouns/[id] - Get a single Noun by ID
 */

import { NextRequest, NextResponse } from 'next/server';
import { neon } from '@neondatabase/serverless';

interface RouteParams {
  params: Promise<{ id: string }>;
}

export async function GET(request: NextRequest, { params }: RouteParams) {
  const { id: idParam } = await params;
  const id = parseInt(idParam);
  
  if (isNaN(id) || id < 0) {
    return NextResponse.json(
      { error: 'Invalid noun ID' },
      { status: 400 }
    );
  }
  
  try {
    const sql = neon(process.env.DATABASE_URL!);
    
    const result = await sql`
      SELECT * FROM legacy_nouns WHERE id = ${id}
    `;
    
    if (result.length === 0) {
      return NextResponse.json(
        { error: 'Noun not found' },
        { status: 404 }
      );
    }
    
    return NextResponse.json(result[0]);
  } catch (error) {
    console.error(`[API] Failed to fetch noun ${id}:`, error);
    return NextResponse.json(
      { error: 'Failed to fetch noun' },
      { status: 500 }
    );
  }
}

