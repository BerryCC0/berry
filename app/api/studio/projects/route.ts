/**
 * Studio Projects — list & create.
 *
 * GET  /api/studio/projects?wallet=0x…&status=draft
 * POST /api/studio/projects        body: { wallet, ...CreateStudioProjectInput }
 */

import { NextRequest, NextResponse } from 'next/server';
import {
  createProject,
  listProjectsByWallet,
} from '@/app/lib/studio/projectsDb';
import {
  authorizeWallet,
  walletFromBody,
  walletFromRequest,
} from '@/app/lib/studio/routeAuth';
import {
  isProjectStatus,
  isTraitType,
  type CreateStudioProjectInput,
  type StudioLayerData,
  type StudioProjectStatus,
  type TraitType,
  TRAIT_TYPES,
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

// ---------------------------------------------------------------------
// Input validation
// ---------------------------------------------------------------------

function isStringArray(value: unknown): value is string[] {
  return Array.isArray(value) && value.every((v) => typeof v === 'string');
}

function isNumberArray(value: unknown, expectedLength: number): value is number[] {
  return (
    Array.isArray(value) &&
    value.length === expectedLength &&
    value.every((v) => typeof v === 'number' && Number.isFinite(v))
  );
}

function isLayerData(value: unknown): value is StudioLayerData {
  if (!value || typeof value !== 'object') return false;
  const v = value as Record<string, unknown>;
  if (typeof v.paletteIndex !== 'number') return false;
  if (!isNumberArray(v.pixels, 1024)) return false;
  if (typeof v.edited !== 'boolean') return false;
  if (v.source !== undefined && v.source !== null) {
    if (typeof v.source !== 'object') return false;
    const s = v.source as Record<string, unknown>;
    if (s.kind !== 'fork-noun' && s.kind !== 'fork-trait') return false;
  }
  return true;
}

function isLayersMap(value: unknown): value is Record<TraitType, StudioLayerData> {
  if (!value || typeof value !== 'object') return false;
  const v = value as Record<string, unknown>;
  return TRAIT_TYPES.every((t) => isLayerData(v[t]));
}

interface ValidatedCreate {
  input: CreateStudioProjectInput;
  wallet: string;
}

function validateCreateBody(
  body: unknown,
  walletFromAuth: string
): ValidatedCreate | { error: string } {
  if (!body || typeof body !== 'object') {
    return { error: 'Body must be a JSON object' };
  }
  const b = body as Record<string, unknown>;

  if (typeof b.name !== 'string' || b.name.trim() === '') {
    return { error: 'name is required' };
  }
  if (!isLayersMap(b.layers)) {
    return {
      error:
        'layers must include all 5 trait types with {paletteIndex, pixels[1024], edited}',
    };
  }
  if (!isStringArray(b.paletteSnapshot)) {
    return { error: 'paletteSnapshot must be string[]' };
  }
  if (
    b.customPalette !== undefined &&
    b.customPalette !== null &&
    !isStringArray(b.customPalette)
  ) {
    return { error: 'customPalette must be string[] or null' };
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
  if (b.status !== undefined && !isProjectStatus(b.status)) {
    return { error: 'status must be one of draft|ready|archived' };
  }

  return {
    input: {
      name: b.name,
      layers: b.layers,
      paletteSnapshot: b.paletteSnapshot,
      customPalette: (b.customPalette ?? null) as string[] | null,
      thumbnailDataUrl: (b.thumbnailDataUrl ?? null) as string | null,
      notes: (b.notes ?? null) as string | null,
      status: (b.status as StudioProjectStatus | undefined) ?? 'draft',
    },
    wallet: walletFromAuth,
  };
}

// ---------------------------------------------------------------------
// Routes
// ---------------------------------------------------------------------

export async function GET(request: NextRequest) {
  if (!dbConfigured()) return dbNotConfiguredResponse();

  const url = new URL(request.url);
  const wallet = walletFromRequest(request);
  const statusParam = url.searchParams.get('status');

  if (statusParam !== null && !isProjectStatus(statusParam)) {
    return NextResponse.json(
      { error: 'status must be one of draft|ready|archived' },
      { status: 400 }
    );
  }
  // Optional trait-type filter is rejected here (this route is projects,
  // not traits) — but accept it as a no-op for clients that pass it.
  if (url.searchParams.has('traitType')) {
    const t = url.searchParams.get('traitType');
    if (t !== null && !isTraitType(t)) {
      return NextResponse.json({ error: 'invalid traitType' }, { status: 400 });
    }
  }

  const auth = await authorizeWallet(request, wallet);
  if (!auth.ok) return auth.response;

  try {
    const projects = await listProjectsByWallet(
      auth.wallet,
      (statusParam as StudioProjectStatus | null) ?? undefined
    );
    return NextResponse.json({ projects });
  } catch (err) {
    console.error('[studio/projects] list failed', err);
    return NextResponse.json(
      { error: 'Failed to list projects' },
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

  const validated = validateCreateBody(body, auth.wallet);
  if ('error' in validated) {
    return NextResponse.json({ error: validated.error }, { status: 400 });
  }

  try {
    const project = await createProject(auth.wallet, validated.input);
    return NextResponse.json({ project }, { status: 201 });
  } catch (err) {
    console.error('[studio/projects] create failed', err);
    return NextResponse.json(
      { error: 'Failed to create project' },
      { status: 500 }
    );
  }
}
