/**
 * Studio Traits — list & create.
 *
 * GET  /api/studio/traits?wallet=…&status=…&traitType=…&projectId=…
 * POST /api/studio/traits   body: { wallet, ...CreateStudioTraitInput }
 */

import { NextRequest, NextResponse } from 'next/server';
import {
  createTrait,
  listTraitsByWallet,
  type ListTraitsFilter,
} from '@/app/lib/studio/traitsDb';
import {
  authorizeWallet,
  walletFromBody,
  walletFromRequest,
} from '@/app/lib/studio/routeAuth';
import {
  isTraitStatus,
  isTraitType,
  type CreateStudioTraitInput,
  type StudioTraitPixelData,
  type StudioTraitStatus,
  type TraitType,
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

function validateCreateBody(
  body: unknown
): CreateStudioTraitInput | { error: string } {
  if (!body || typeof body !== 'object') {
    return { error: 'Body must be a JSON object' };
  }
  const b = body as Record<string, unknown>;

  if (typeof b.name !== 'string' || b.name.trim() === '') {
    return { error: 'name is required' };
  }
  if (!isTraitType(b.traitType)) {
    return {
      error:
        'traitType must be one of head|body|accessory|glasses|background',
    };
  }
  if (!isPixelData(b.pixelData)) {
    return { error: 'pixelData must be { paletteIndex, pixels[1024] }' };
  }
  if (!isStringArray(b.paletteSnapshot)) {
    return { error: 'paletteSnapshot must be string[]' };
  }
  if (
    b.thumbnailDataUrl !== undefined &&
    b.thumbnailDataUrl !== null &&
    typeof b.thumbnailDataUrl !== 'string'
  ) {
    return { error: 'thumbnailDataUrl must be string or null' };
  }
  if (
    b.notes !== undefined &&
    b.notes !== null &&
    typeof b.notes !== 'string'
  ) {
    return { error: 'notes must be string or null' };
  }
  if (b.status !== undefined && !isTraitStatus(b.status)) {
    return { error: 'status must be one of draft|ready|submitted|archived' };
  }
  if (
    b.projectId !== undefined &&
    b.projectId !== null &&
    typeof b.projectId !== 'string'
  ) {
    return { error: 'projectId must be a UUID string or null' };
  }
  if (
    b.submittedProposalId !== undefined &&
    b.submittedProposalId !== null &&
    typeof b.submittedProposalId !== 'number'
  ) {
    return { error: 'submittedProposalId must be a number or null' };
  }
  if (
    b.submittedCandidateSlug !== undefined &&
    b.submittedCandidateSlug !== null &&
    typeof b.submittedCandidateSlug !== 'string'
  ) {
    return { error: 'submittedCandidateSlug must be string or null' };
  }

  return {
    name: b.name,
    traitType: b.traitType as TraitType,
    pixelData: b.pixelData,
    paletteSnapshot: b.paletteSnapshot,
    thumbnailDataUrl: (b.thumbnailDataUrl ?? null) as string | null,
    notes: (b.notes ?? null) as string | null,
    status: (b.status as StudioTraitStatus | undefined) ?? 'draft',
    projectId: (b.projectId ?? null) as string | null,
    submittedProposalId: (b.submittedProposalId ?? null) as number | null,
    submittedCandidateSlug: (b.submittedCandidateSlug ?? null) as string | null,
  };
}

export async function GET(request: NextRequest) {
  if (!dbConfigured()) return dbNotConfiguredResponse();

  const url = new URL(request.url);
  const wallet = walletFromRequest(request);

  const statusParam = url.searchParams.get('status');
  const traitTypeParam = url.searchParams.get('traitType');
  const projectIdParam = url.searchParams.get('projectId');

  if (statusParam !== null && !isTraitStatus(statusParam)) {
    return NextResponse.json(
      { error: 'status must be one of draft|ready|submitted|archived' },
      { status: 400 }
    );
  }
  if (traitTypeParam !== null && !isTraitType(traitTypeParam)) {
    return NextResponse.json(
      { error: 'invalid traitType' },
      { status: 400 }
    );
  }

  const auth = await authorizeWallet(request, wallet);
  if (!auth.ok) return auth.response;

  const filter: ListTraitsFilter = {};
  if (statusParam) filter.status = statusParam as StudioTraitStatus;
  if (traitTypeParam) filter.traitType = traitTypeParam as TraitType;
  if (projectIdParam) filter.projectId = projectIdParam;

  try {
    const traits = await listTraitsByWallet(auth.wallet, filter);
    return NextResponse.json({ traits });
  } catch (err) {
    console.error('[studio/traits] list failed', err);
    return NextResponse.json(
      { error: 'Failed to list traits' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  if (!dbConfigured()) return dbNotConfiguredResponse();

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

  const validated = validateCreateBody(body);
  if ('error' in validated) {
    return NextResponse.json({ error: validated.error }, { status: 400 });
  }

  try {
    const trait = await createTrait(auth.wallet, validated);
    return NextResponse.json({ trait }, { status: 201 });
  } catch (err) {
    console.error('[studio/traits] create failed', err);
    return NextResponse.json(
      { error: 'Failed to create trait' },
      { status: 500 }
    );
  }
}
