/**
 * Activity Feed API Route
 *
 * Registry-driven: every activity producer's SQL lives in its definition
 * under `src/OS/Apps/nouns/Camp/activity/definitions/*.ts`. This route
 * just wires the registry to the request — no SQL here.
 *
 * Per-producer fault isolation is handled by `runActivityQueries` (which
 * delegates to `safeAll`). A failing query for one producer returns `[]`
 * for that slot and surfaces in `_failedProducers` in dev. The rest of
 * the feed still loads. See `app/lib/safeAll.ts`.
 *
 * To add a producer: create a new definition file and register it.
 * The query, the row shape, the transform, and the rendering all live
 * together. See `docs/ACTIVITY-REFACTOR.md` for the architecture writeup.
 */

import { NextRequest, NextResponse } from 'next/server';
import { ponderSql } from '@/app/lib/ponder-db';
import { runActivityQueries } from '@/OS/Apps/nouns/Camp/activity/orchestrator';

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const limit = Math.min(parseInt(searchParams.get('limit') || '30'), 100);
  const since =
    searchParams.get('since') ||
    String(Math.floor(Date.now() / 1000) - 14 * 24 * 60 * 60);

  try {
    const sql = ponderSql();
    const data = await runActivityQueries(sql, { since, limit });
    return NextResponse.json(data);
  } catch (error) {
    console.error('Failed to fetch activity:', error);
    return NextResponse.json({ error: 'Failed to fetch activity' }, { status: 500 });
  }
}
