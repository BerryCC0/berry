/**
 * Studio Trait — single resource.
 *
 * GET    /api/studio/traits/:id?wallet=…
 * PATCH  /api/studio/traits/:id     body: { wallet, ...UpdateStudioTraitInput }
 * DELETE /api/studio/traits/:id?wallet=…
 */

import { NextRequest, NextResponse } from 'next/server';
import {
  deleteTrait,
  getTrait,
  updateTrait,
} from '@/app/lib/studio/traitsDb';
import {
  authorizeWallet,
  walletFromBody,
  walletFromRequest,
} from '@/app/lib/studio/routeAuth';
import {
  isTraitStatus,
  isTraitType,
  type StudioTraitPixelData,
  type StudioTraitStatus,
  type TraitType,
  type UpdateStudioTraitInput,
} from '@/app/lib/studio/types';

function dbConfigured(): boolean {
  return Boolean(process.env.DATABASE_URL);
}
function dbNotConfiguredResponse(): NextResponse {
  return NextResponse.json(
    { error: 'Database not configured' },
    { status: 500 }
  );
}

function isStringArray(value: unknown): value is string[] {
  return Array.isArray(value) && value.every((v) => typeof v === 'string');
}

function isPixelData(value: unknown): value is StudioTraitPixelData {
  if (!value || typeof value !== 'object') return false;
  const v = value as Record<string, unknown>;
  if (typeof v.paletteIndex !== 'number') return false;
  if (!Array.isArray(v.pixels) || v.pixels.length !== 1024) return false;
  return v.pixels.every((p) => typeof p === 'number' && Number.isFinite(p));
}

function validatePatch(body: unknown): UpdateStudioTraitInput | { error: string } {
  if (!body || typeof body !== 'object') {
    return { error: 'Body must be a JSON object' };
  }
  const b = body as Record<string, unknown>;
  const patch: UpdateStudioTraitInput = {};

  if ('name' in b) {
    if (typeof b.name !== 'string' || b.name.trim() === '') {
      return { error: 'name must be a non-empty string' };
    }
    patch.name = b.name;
  }
  if ('traitType' in b) {
    if (!isTraitType(b.traitType)) {
      return { error: 'invalid traitType' };
    }
    patch.traitType = b.traitType as TraitType;
  }
  if ('pixelData' in b) {
    if (!isPixelData(b.pixelData)) {
      return { error: 'pixelData must be { paletteIndex, pixels[1024] }' };
    }
    patch.pixelData = b.pixelData;
  }
  if ('paletteSnapshot' in b) {
    if (!isStringArray(b.paletteSnapshot)) {
      return { error: 'paletteSnapshot must be string[]' };
    }
    patch.paletteSnapshot = b.paletteSnapshot;
  }
  if ('thumbnailDataUrl' in b) {
    if (b.thumbnailDataUrl !== null && typeof b.thumbnailDataUrl !== 'string') {
      return { error: 'thumbnailDataUrl must be string or null' };
    }
    patch.thumbnailDataUrl = b.thumbnailDataUrl as string | null;
  }
  if ('notes' in b) {
    if (b.notes !== null && typeof b.notes !== 'string') {
      return { error: 'notes must be string or null' };
    }
    patch.notes = b.notes as string | null;
  }
  if ('status' in b) {
    if (!isTraitStatus(b.status)) {
      return { error: 'status must be one of draft|ready|submitted|archived' };
    }
    patch.status = b.status as StudioTraitStatus;
  }
  if ('projectId' in b) {
    if (b.projectId !== null && typeof b.projectId !== 'string') {
      return { error: 'projectId must be a UUID string or null' };
    }
    patch.projectId = b.projectId as string | null;
  }
  if ('submittedProposalId' in b) {
    if (b.submittedProposalId !== null && typeof b.submittedProposalId !== 'number') {
      return { error: 'submittedProposalId must be a number or null' };
    }
    patch.submittedProposalId = b.submittedProposalId as number | null;
  }
  if ('submittedCandidateSlug' in b) {
    if (
      b.submittedCandidateSlug !== null &&
      typeof b.submittedCandidateSlug !== 'string'
    ) {
      return { error: 'submittedCandidateSlug must be string or null' };
    }
    patch.submittedCandidateSlug = b.submittedCandidateSlug as string | null;
  }

  return patch;
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  if (!dbConfigured()) return dbNotConfiguredResponse();
  const { id } = await params;

  const wallet = walletFromRequest(request);
  const auth = await authorizeWallet(request, wallet);
  if (!auth.ok) return auth.response;

  try {
    const trait = await getTrait(id, auth.wallet);
    if (!trait) {
      return NextResponse.json({ error: 'Not found' }, { status: 404 });
    }
    return NextResponse.json({ trait });
  } catch (err) {
    console.error('[studio/traits/:id] get failed', err);
    return NextResponse.json(
      { error: 'Failed to load trait' },
      { status: 500 }
    );
  }
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  if (!dbConfigured()) return dbNotConfiguredResponse();
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

  const patch = validatePatch(body);
  if ('error' in patch) {
    return NextResponse.json({ error: patch.error }, { status: 400 });
  }

  try {
    const trait = await updateTrait(id, auth.wallet, patch);
    if (!trait) {
      return NextResponse.json({ error: 'Not found' }, { status: 404 });
    }
    return NextResponse.json({ trait });
  } catch (err) {
    console.error('[studio/traits/:id] patch failed', err);
    return NextResponse.json(
      { error: 'Failed to update trait' },
      { status: 500 }
    );
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  if (!dbConfigured()) return dbNotConfiguredResponse();
  const { id } = await params;

  const wallet = walletFromRequest(request);
  const auth = await authorizeWallet(request, wallet);
  if (!auth.ok) return auth.response;

  try {
    const ok = await deleteTrait(id, auth.wallet);
    if (!ok) {
      return NextResponse.json({ error: 'Not found' }, { status: 404 });
    }
    return new NextResponse(null, { status: 204 });
  } catch (err) {
    console.error('[studio/traits/:id] delete failed', err);
    return NextResponse.json(
      { error: 'Failed to delete trait' },
      { status: 500 }
    );
  }
}
