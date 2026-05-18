/**
 * Studio Project — single resource.
 *
 * GET    /api/studio/projects/:id?wallet=…
 * PATCH  /api/studio/projects/:id     body: { wallet, ...UpdateStudioProjectInput }
 * DELETE /api/studio/projects/:id?wallet=…
 */

import { NextRequest, NextResponse } from 'next/server';
import {
  deleteProject,
  getProject,
  updateProject,
} from '@/app/lib/studio/projectsDb';
import {
  authorizeWallet,
  walletFromBody,
  walletFromRequest,
} from '@/app/lib/studio/routeAuth';
import {
  isProjectStatus,
  type StudioLayerData,
  type StudioProjectStatus,
  type TraitType,
  TRAIT_TYPES,
  type UpdateStudioProjectInput,
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
  return true;
}

function isLayersMap(value: unknown): value is Record<TraitType, StudioLayerData> {
  if (!value || typeof value !== 'object') return false;
  const v = value as Record<string, unknown>;
  return TRAIT_TYPES.every((t) => isLayerData(v[t]));
}

function validatePatch(body: unknown): UpdateStudioProjectInput | { error: string } {
  if (!body || typeof body !== 'object') {
    return { error: 'Body must be a JSON object' };
  }
  const b = body as Record<string, unknown>;
  const patch: UpdateStudioProjectInput = {};

  if ('name' in b) {
    if (typeof b.name !== 'string' || b.name.trim() === '') {
      return { error: 'name must be a non-empty string' };
    }
    patch.name = b.name;
  }
  if ('layers' in b) {
    if (!isLayersMap(b.layers)) {
      return { error: 'layers must include all 5 trait types' };
    }
    patch.layers = b.layers;
  }
  if ('paletteSnapshot' in b) {
    if (!isStringArray(b.paletteSnapshot)) {
      return { error: 'paletteSnapshot must be string[]' };
    }
    patch.paletteSnapshot = b.paletteSnapshot;
  }
  if ('customPalette' in b) {
    if (b.customPalette !== null && !isStringArray(b.customPalette)) {
      return { error: 'customPalette must be string[] or null' };
    }
    patch.customPalette = b.customPalette as string[] | null;
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
    if (!isProjectStatus(b.status)) {
      return { error: 'status must be one of draft|ready|archived' };
    }
    patch.status = b.status as StudioProjectStatus;
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
    const project = await getProject(id, auth.wallet);
    if (!project) {
      return NextResponse.json({ error: 'Not found' }, { status: 404 });
    }
    return NextResponse.json({ project });
  } catch (err) {
    console.error('[studio/projects/:id] get failed', err);
    return NextResponse.json(
      { error: 'Failed to load project' },
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
    const project = await updateProject(id, auth.wallet, patch);
    if (!project) {
      return NextResponse.json({ error: 'Not found' }, { status: 404 });
    }
    return NextResponse.json({ project });
  } catch (err) {
    console.error('[studio/projects/:id] patch failed', err);
    return NextResponse.json(
      { error: 'Failed to update project' },
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
    const ok = await deleteProject(id, auth.wallet);
    if (!ok) {
      return NextResponse.json({ error: 'Not found' }, { status: 404 });
    }
    return new NextResponse(null, { status: 204 });
  } catch (err) {
    console.error('[studio/projects/:id] delete failed', err);
    return NextResponse.json(
      { error: 'Failed to delete project' },
      { status: 500 }
    );
  }
}
