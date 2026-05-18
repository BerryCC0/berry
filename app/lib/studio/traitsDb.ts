/**
 * Berry Studio — traits table DB helpers.
 *
 * Wallet-scoped CRUD over `studio_traits`. See `projectsDb.ts` for the
 * pattern rationale.
 */

import { sql as db, asJson } from '@/app/lib/db';
import { getProject } from './projectsDb';
import type {
  CreateStudioTraitInput,
  StudioTrait,
  StudioTraitStatus,
  TraitType,
  UpdateStudioTraitInput,
} from './types';

type DbRow = Record<string, unknown>;

function normalizeWallet(wallet: string): string {
  return wallet.toLowerCase();
}

function parseJsonColumn<T>(value: unknown): T {
  if (typeof value === 'string') {
    return JSON.parse(value) as T;
  }
  return value as T;
}

function toNullableNumber(value: unknown): number | null {
  if (value === null || value === undefined) return null;
  // bigint columns come back as strings from postgres-js (see app/lib/db.ts).
  if (typeof value === 'string') return value === '' ? null : Number(value);
  if (typeof value === 'number') return value;
  return null;
}

function rowToTrait(row: DbRow): StudioTrait {
  return {
    id: row.id as string,
    wallet: row.wallet as string,
    name: row.name as string,
    traitType: row.trait_type as TraitType,
    pixelData: parseJsonColumn(row.pixel_data),
    paletteSnapshot: parseJsonColumn(row.palette_snapshot),
    thumbnailDataUrl: (row.thumbnail_data_url as string | null) ?? null,
    notes: (row.notes as string | null) ?? null,
    status: row.status as StudioTraitStatus,
    projectId: (row.project_id as string | null) ?? null,
    submittedProposalId: toNullableNumber(row.submitted_proposal_id),
    submittedCandidateSlug:
      (row.submitted_candidate_slug as string | null) ?? null,
    createdAt: new Date(row.created_at as string).toISOString(),
    updatedAt: new Date(row.updated_at as string).toISOString(),
  };
}

// ---------------------------------------------------------------------
// Read
// ---------------------------------------------------------------------

export interface ListTraitsFilter {
  status?: StudioTraitStatus;
  traitType?: TraitType;
  projectId?: string;
}

export async function listTraitsByWallet(
  wallet: string,
  filter: ListTraitsFilter = {}
): Promise<StudioTrait[]> {
  const sql = db();
  const w = normalizeWallet(wallet);
  const { status, traitType, projectId } = filter;

  // Compose AND clauses as `sql` fragments (postgres-js's documented
  // pattern for conditional WHERE).
  const rows = await sql`
    SELECT * FROM studio_traits
    WHERE wallet = ${w}
      ${status ? sql`AND status = ${status}` : sql``}
      ${traitType ? sql`AND trait_type = ${traitType}` : sql``}
      ${projectId ? sql`AND project_id = ${projectId}` : sql``}
    ORDER BY updated_at DESC
  `;

  return rows.map((r) => rowToTrait(r as DbRow));
}

export async function getTrait(
  id: string,
  wallet: string
): Promise<StudioTrait | null> {
  const sql = db();
  const w = normalizeWallet(wallet);

  const rows = await sql`
    SELECT * FROM studio_traits
    WHERE id = ${id} AND wallet = ${w}
    LIMIT 1
  `;

  if (rows.length === 0) return null;
  return rowToTrait(rows[0] as DbRow);
}

// ---------------------------------------------------------------------
// Write
// ---------------------------------------------------------------------

export async function createTrait(
  wallet: string,
  input: CreateStudioTraitInput
): Promise<StudioTrait> {
  const sql = db();
  const w = normalizeWallet(wallet);

  const rows = await sql`
    INSERT INTO studio_traits (
      wallet, name, trait_type, pixel_data, palette_snapshot,
      thumbnail_data_url, notes, status, project_id,
      submitted_proposal_id, submitted_candidate_slug
    ) VALUES (
      ${w},
      ${input.name},
      ${input.traitType},
      ${asJson(input.pixelData)},
      ${asJson(input.paletteSnapshot)},
      ${input.thumbnailDataUrl ?? null},
      ${input.notes ?? null},
      ${input.status ?? 'draft'},
      ${input.projectId ?? null},
      ${input.submittedProposalId ?? null},
      ${input.submittedCandidateSlug ?? null}
    )
    RETURNING *
  `;

  return rowToTrait(rows[0] as DbRow);
}

/**
 * Partial update. See `updateProject` in projectsDb.ts for rationale
 * on the per-field UPDATE strategy.
 */
export async function updateTrait(
  id: string,
  wallet: string,
  patch: UpdateStudioTraitInput
): Promise<StudioTrait | null> {
  const sql = db();
  const w = normalizeWallet(wallet);

  const has = <K extends keyof UpdateStudioTraitInput>(k: K): boolean =>
    Object.prototype.hasOwnProperty.call(patch, k);

  const existing = await getTrait(id, wallet);
  if (!existing) return null;

  if (has('name')) {
    await sql`
      UPDATE studio_traits SET name = ${patch.name as string}
      WHERE id = ${id} AND wallet = ${w}
    `;
  }
  if (has('traitType')) {
    await sql`
      UPDATE studio_traits SET trait_type = ${patch.traitType as TraitType}
      WHERE id = ${id} AND wallet = ${w}
    `;
  }
  if (has('pixelData')) {
    await sql`
      UPDATE studio_traits SET pixel_data = ${asJson(patch.pixelData)}
      WHERE id = ${id} AND wallet = ${w}
    `;
  }
  if (has('paletteSnapshot')) {
    await sql`
      UPDATE studio_traits SET palette_snapshot = ${asJson(patch.paletteSnapshot)}
      WHERE id = ${id} AND wallet = ${w}
    `;
  }
  if (has('thumbnailDataUrl')) {
    await sql`
      UPDATE studio_traits SET thumbnail_data_url = ${patch.thumbnailDataUrl ?? null}
      WHERE id = ${id} AND wallet = ${w}
    `;
  }
  if (has('notes')) {
    await sql`
      UPDATE studio_traits SET notes = ${patch.notes ?? null}
      WHERE id = ${id} AND wallet = ${w}
    `;
  }
  if (has('status')) {
    await sql`
      UPDATE studio_traits SET status = ${patch.status as StudioTraitStatus}
      WHERE id = ${id} AND wallet = ${w}
    `;
  }
  if (has('projectId')) {
    await sql`
      UPDATE studio_traits SET project_id = ${patch.projectId ?? null}
      WHERE id = ${id} AND wallet = ${w}
    `;
  }
  if (has('submittedProposalId')) {
    await sql`
      UPDATE studio_traits SET submitted_proposal_id = ${patch.submittedProposalId ?? null}
      WHERE id = ${id} AND wallet = ${w}
    `;
  }
  if (has('submittedCandidateSlug')) {
    await sql`
      UPDATE studio_traits SET submitted_candidate_slug = ${patch.submittedCandidateSlug ?? null}
      WHERE id = ${id} AND wallet = ${w}
    `;
  }

  await sql`
    UPDATE studio_traits SET updated_at = NOW()
    WHERE id = ${id} AND wallet = ${w}
  `;

  return getTrait(id, wallet);
}

export async function deleteTrait(
  id: string,
  wallet: string
): Promise<boolean> {
  const sql = db();
  const w = normalizeWallet(wallet);

  const result = await sql`
    DELETE FROM studio_traits
    WHERE id = ${id} AND wallet = ${w}
  `;

  return result.count > 0;
}

/**
 * Create a new standalone trait by extracting one layer from a project.
 *
 * Reads the source project (wallet-scoped) and inserts a trait row
 * carrying the layer's pixel data and the project's palette snapshot.
 * Returns null if the project doesn't belong to `wallet` or the
 * requested layer is missing.
 */
export async function extractTraitFromProject(
  projectId: string,
  wallet: string,
  traitType: TraitType,
  name: string,
  options: {
    thumbnailDataUrl?: string | null;
    notes?: string | null;
    status?: StudioTraitStatus;
  } = {}
): Promise<StudioTrait | null> {
  const project = await getProject(projectId, wallet);
  if (!project) return null;

  const layer = project.layers[traitType];
  if (!layer) return null;

  return createTrait(wallet, {
    name,
    traitType,
    pixelData: {
      paletteIndex: layer.paletteIndex,
      pixels: layer.pixels,
    },
    paletteSnapshot: project.paletteSnapshot,
    thumbnailDataUrl: options.thumbnailDataUrl ?? null,
    notes: options.notes ?? null,
    status: options.status ?? 'draft',
    projectId: project.id,
  });
}
