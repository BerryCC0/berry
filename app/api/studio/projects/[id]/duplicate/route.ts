/**
 * Studio Project — duplicate.
 *
 * POST /api/studio/projects/:id/duplicate    body: { wallet, name }
 *
 * Creates a copy of the project at :id under the same wallet. The new
 * project gets a fresh UUID, the supplied `name`, and is reset to
 * status='draft'.
 */

import { NextRequest, NextResponse } from 'next/server';
import { duplicateProject } from '@/app/lib/studio/projectsDb';
import {
  authorizeWallet,
  walletFromBody,
  walletFromRequest,
} from '@/app/lib/studio/routeAuth';

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
  if (typeof b.name !== 'string' || b.name.trim() === '') {
    return NextResponse.json(
      { error: 'name is required' },
      { status: 400 }
    );
  }

  try {
    const project = await duplicateProject(id, auth.wallet, b.name);
    if (!project) {
      return NextResponse.json({ error: 'Not found' }, { status: 404 });
    }
    return NextResponse.json({ project }, { status: 201 });
  } catch (err) {
    console.error('[studio/projects/:id/duplicate] failed', err);
    return NextResponse.json(
      { error: 'Failed to duplicate project' },
      { status: 500 }
    );
  }
}
