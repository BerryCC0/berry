/**
 * Berry Studio — projects table DB helpers.
 *
 * All functions take a wallet address (normalized to lowercase) and
 * enforce wallet scoping at the SQL level: a row belonging to wallet X
 * is invisible (and unmodifiable) to wallet Y. Combined with the
 * route-level wallet auth check, this prevents cross-tenant access
 * even if a caller spoofs a UUID.
 */

import { sql as db, asJson } from '@/app/lib/db';
import type {
  CreateStudioProjectInput,
  StudioProject,
  StudioProjectStatus,
  UpdateStudioProjectInput,
} from './types';

type DbRow = Record<string, unknown>;

/** Normalize wallet to lowercase. Centralized so every query agrees. */
function normalizeWallet(wallet: string): string {
  return wallet.toLowerCase();
}

/**
 * postgres-js returns jsonb columns as already-parsed JS values, but
 * we accept stringified values defensively (matches the proposal_drafts
 * route which has both shapes in the wild).
 */
function parseJsonColumn<T>(value: unknown): T {
  if (typeof value === 'string') {
    return JSON.parse(value) as T;
  }
  return value as T;
}

function rowToProject(row: DbRow): StudioProject {
  return {
    id: row.id as string,
    wallet: row.wallet as string,
    name: row.name as string,
    layers: parseJsonColumn(row.layers),
    paletteSnapshot: parseJsonColumn(row.palette_snapshot),
    customPalette:
      row.custom_palette === null || row.custom_palette === undefined
        ? null
        : parseJsonColumn(row.custom_palette),
    thumbnailDataUrl: (row.thumbnail_data_url as string | null) ?? null,
    notes: (row.notes as string | null) ?? null,
    status: row.status as StudioProjectStatus,
    createdAt: new Date(row.created_at as string).toISOString(),
    updatedAt: new Date(row.updated_at as string).toISOString(),
  };
}

// ---------------------------------------------------------------------
// Read
// ---------------------------------------------------------------------

export async function listProjectsByWallet(
  wallet: string,
  status?: StudioProjectStatus
): Promise<StudioProject[]> {
  const sql = db();
  const w = normalizeWallet(wallet);

  const rows = status
    ? await sql`
        SELECT * FROM studio_projects
        WHERE wallet = ${w} AND status = ${status}
        ORDER BY updated_at DESC
      `
    : await sql`
        SELECT * FROM studio_projects
        WHERE wallet = ${w}
        ORDER BY updated_at DESC
      `;

  return rows.map((r) => rowToProject(r as DbRow));
}

export async function getProject(
  id: string,
  wallet: string
): Promise<StudioProject | null> {
  const sql = db();
  const w = normalizeWallet(wallet);

  const rows = await sql`
    SELECT * FROM studio_projects
    WHERE id = ${id} AND wallet = ${w}
    LIMIT 1
  `;

  if (rows.length === 0) return null;
  return rowToProject(rows[0] as DbRow);
}

// ---------------------------------------------------------------------
// Write
// ---------------------------------------------------------------------

export async function createProject(
  wallet: string,
  input: CreateStudioProjectInput
): Promise<StudioProject> {
  const sql = db();
  const w = normalizeWallet(wallet);

  const rows = await sql`
    INSERT INTO studio_projects (
      wallet, name, layers, palette_snapshot, custom_palette,
      thumbnail_data_url, notes, status
    ) VALUES (
      ${w},
      ${input.name},
      ${asJson(input.layers)},
      ${asJson(input.paletteSnapshot)},
      ${
        input.customPalette === undefined || input.customPalette === null
          ? null
          : asJson(input.customPalette)
      },
      ${input.thumbnailDataUrl ?? null},
      ${input.notes ?? null},
      ${input.status ?? 'draft'}
    )
    RETURNING *
  `;

  return rowToProject(rows[0] as DbRow);
}

/**
 * Partial update. Each column is updated independently against
 * `id = ? AND wallet = ?`, then a final RETURNING row is fetched.
 *
 * Implemented as discrete UPDATE statements per dirty field (rather
 * than a single dynamic SET) because postgres-js's `sql(obj, ...keys)`
 * helper expects bare values, not pre-wrapped `asJson()` calls, and
 * mixing JSON columns with scalars in one builder call gets messy.
 *
 * Returns null if no row matched the wallet/id pair.
 */
export async function updateProject(
  id: string,
  wallet: string,
  patch: UpdateStudioProjectInput
): Promise<StudioProject | null> {
  const sql = db();
  const w = normalizeWallet(wallet);

  const has = <K extends keyof UpdateStudioProjectInput>(k: K): boolean =>
    Object.prototype.hasOwnProperty.call(patch, k);

  // Ensure the row exists and belongs to wallet before issuing updates.
  const existing = await getProject(id, wallet);
  if (!existing) return null;

  if (has('name')) {
    await sql`
      UPDATE studio_projects SET name = ${patch.name as string}
      WHERE id = ${id} AND wallet = ${w}
    `;
  }
  if (has('layers')) {
    await sql`
      UPDATE studio_projects SET layers = ${asJson(patch.layers)}
      WHERE id = ${id} AND wallet = ${w}
    `;
  }
  if (has('paletteSnapshot')) {
    await sql`
      UPDATE studio_projects SET palette_snapshot = ${asJson(patch.paletteSnapshot)}
      WHERE id = ${id} AND wallet = ${w}
    `;
  }
  if (has('customPalette')) {
    await sql`
      UPDATE studio_projects SET custom_palette = ${
        patch.customPalette === null ? null : asJson(patch.customPalette)
      }
      WHERE id = ${id} AND wallet = ${w}
    `;
  }
  if (has('thumbnailDataUrl')) {
    await sql`
      UPDATE studio_projects SET thumbnail_data_url = ${patch.thumbnailDataUrl ?? null}
      WHERE id = ${id} AND wallet = ${w}
    `;
  }
  if (has('notes')) {
    await sql`
      UPDATE studio_projects SET notes = ${patch.notes ?? null}
      WHERE id = ${id} AND wallet = ${w}
    `;
  }
  if (has('status')) {
    await sql`
      UPDATE studio_projects SET status = ${patch.status as StudioProjectStatus}
      WHERE id = ${id} AND wallet = ${w}
    `;
  }

  // Always bump updated_at so list ordering stays useful even if the
  // caller only changed one field (or — edge case — passed an empty patch).
  await sql`
    UPDATE studio_projects SET updated_at = NOW()
    WHERE id = ${id} AND wallet = ${w}
  `;

  return getProject(id, wallet);
}

export async function deleteProject(
  id: string,
  wallet: string
): Promise<boolean> {
  const sql = db();
  const w = normalizeWallet(wallet);

  const result = await sql`
    DELETE FROM studio_projects
    WHERE id = ${id} AND wallet = ${w}
  `;

  return result.count > 0;
}

/**
 * Duplicate a project. The new project takes `newName`, is reset to
 * status='draft', and gets fresh created_at/updated_at timestamps.
 * Returns null if the source project doesn't belong to `wallet`.
 */
export async function duplicateProject(
  id: string,
  wallet: string,
  newName: string
): Promise<StudioProject | null> {
  const sql = db();
  const w = normalizeWallet(wallet);

  const rows = await sql`
    INSERT INTO studio_projects (
      wallet, name, layers, palette_snapshot, custom_palette,
      thumbnail_data_url, notes, status
    )
    SELECT
      wallet, ${newName}, layers, palette_snapshot, custom_palette,
      thumbnail_data_url, notes, 'draft'
    FROM studio_projects
    WHERE id = ${id} AND wallet = ${w}
    RETURNING *
  `;

  if (rows.length === 0) return null;
  return rowToProject(rows[0] as DbRow);
}
