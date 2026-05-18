/**
 * Studio Project — extract one layer as a standalone trait.
 *
 * POST /api/studio/projects/:id/extract-trait
 *   body: {
 *     wallet,
 *     traitType: 'head'|'body'|'accessory'|'glasses'|'background',
 *     name,
 *     thumbnailDataUrl?, notes?, status?
 *   }
 *
 * Reads layer `traitType` from the source project (under the caller's
 * wallet), then creates a new row in `studio_traits` carrying that
 * layer's pixel data and the project's palette snapshot. The new trait
 * remembers its source via `project_id`.
 */

import { NextRequest, NextResponse } from 'next/server';
import { extractTraitFromProject } from '@/app/lib/studio/traitsDb';
import {
  authorizeWallet,
  walletFromBody,
  walletFromRequest,
} from '@/app/lib/studio/routeAuth';
import {
  isTraitStatus,
  isTraitType,
  type StudioTraitStatus,
  type TraitType,
} from '@/app/lib/studio/types';

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  if (!process.env.DATABASE_URL) {
    return NextResponse.json(
      { error: 'Database not configured' },
      { status: 500 }
    );
  }

  const { id } = await params;

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
  }

  const queryWallet = walletFromRequest(request);
  const bodyWallet = walletFromBody(body, queryWallet);
  const auth = await authorizeWallet(request, bodyWallet);
  if (!auth.ok) return auth.response;

  const b = (body && typeof body === 'object' ? body : {}) as Record<string, unknown>;
  if (!isTraitType(b.traitType)) {
    return NextResponse.json(
      { error: 'traitType is required (head|body|accessory|glasses|background)' },
      { status: 400 }
    );
  }
  if (typeof b.name !== 'string' || b.name.trim() === '') {
    return NextResponse.json({ error: 'name is required' }, { status: 400 });
  }
  if (
    b.thumbnailDataUrl !== undefined &&
    b.thumbnailDataUrl !== null &&
    typeof b.thumbnailDataUrl !== 'string'
  ) {
    return NextResponse.json(
      { error: 'thumbnailDataUrl must be string or null' },
      { status: 400 }
    );
  }
  if (
    b.notes !== undefined &&
    b.notes !== null &&
    typeof b.notes !== 'string'
  ) {
    return NextResponse.json(
      { error: 'notes must be string or null' },
      { status: 400 }
    );
  }
  if (b.status !== undefined && !isTraitStatus(b.status)) {
    return NextResponse.json(
      { error: 'status must be one of draft|ready|submitted|archived' },
      { status: 400 }
    );
  }

  try {
    const trait = await extractTraitFromProject(
      id,
      auth.wallet,
      b.traitType as TraitType,
      b.name,
      {
        thumbnailDataUrl: (b.thumbnailDataUrl ?? null) as string | null,
        notes: (b.notes ?? null) as string | null,
        status: (b.status as StudioTraitStatus | undefined) ?? 'draft',
      }
    );
    if (!trait) {
      return NextResponse.json({ error: 'Not found' }, { status: 404 });
    }
    return NextResponse.json({ trait }, { status: 201 });
  } catch (err) {
    console.error('[studio/projects/:id/extract-trait] failed', err);
    return NextResponse.json(
      { error: 'Failed to extract trait' },
      { status: 500 }
    );
  }
}
