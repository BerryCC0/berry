/**
 * Berry Studio — wallet-scoped persistence types.
 *
 * Mirrors the columns in `app/lib/studio/schema.sql`. Snake_case DB rows
 * are converted to the camelCase shapes below in the DB helper layer
 * (`projectsDb.ts`, `traitsDb.ts`).
 */

export type TraitType =
  | 'head'
  | 'body'
  | 'accessory'
  | 'glasses'
  | 'background';

export const TRAIT_TYPES: readonly TraitType[] = [
  'head',
  'body',
  'accessory',
  'glasses',
  'background',
] as const;

export type StudioProjectStatus = 'draft' | 'ready' | 'archived';

export type StudioTraitStatus =
  | 'draft'
  | 'ready'
  | 'submitted'
  | 'archived';

/**
 * Source provenance for a layer in a project — where the pixels came
 * from before the user started editing.
 */
export interface StudioLayerSource {
  kind: 'fork-noun' | 'fork-trait';
  /** Index into the on-chain trait array for the matching trait_type. */
  traitIndex?: number;
  /** Source Noun ID, when `kind === 'fork-noun'`. */
  nounId?: number;
}

/**
 * A single 32×32 layer. `pixels` is a flat row-major array of
 * palette indices (length 1024). `paletteIndex` selects which of
 * the on-chain palette banks the indices reference.
 */
export interface StudioLayerData {
  paletteIndex: number;
  /** 32 × 32 = 1024 palette indices, row-major. */
  pixels: number[];
  edited: boolean;
  source?: StudioLayerSource;
}

export interface StudioProject {
  id: string;
  wallet: string;
  name: string;
  layers: Record<TraitType, StudioLayerData>;
  paletteSnapshot: string[];
  customPalette: string[] | null;
  thumbnailDataUrl: string | null;
  notes: string | null;
  status: StudioProjectStatus;
  createdAt: string;
  updatedAt: string;
}

/**
 * Pixel data for a single trait. Matches the shape of one entry in
 * `StudioProject.layers`, minus the editing/provenance metadata.
 */
export interface StudioTraitPixelData {
  paletteIndex: number;
  /** 32 × 32 = 1024 palette indices, row-major. */
  pixels: number[];
}

export interface StudioTrait {
  id: string;
  wallet: string;
  name: string;
  traitType: TraitType;
  pixelData: StudioTraitPixelData;
  paletteSnapshot: string[];
  thumbnailDataUrl: string | null;
  notes: string | null;
  status: StudioTraitStatus;
  projectId: string | null;
  submittedProposalId: number | null;
  submittedCandidateSlug: string | null;
  createdAt: string;
  updatedAt: string;
}

// ---------------------------------------------------------------------
// Create / update inputs
// ---------------------------------------------------------------------

export interface CreateStudioProjectInput {
  name: string;
  layers: Record<TraitType, StudioLayerData>;
  paletteSnapshot: string[];
  customPalette?: string[] | null;
  thumbnailDataUrl?: string | null;
  notes?: string | null;
  status?: StudioProjectStatus;
}

export interface UpdateStudioProjectInput {
  name?: string;
  layers?: Record<TraitType, StudioLayerData>;
  paletteSnapshot?: string[];
  customPalette?: string[] | null;
  thumbnailDataUrl?: string | null;
  notes?: string | null;
  status?: StudioProjectStatus;
}

export interface CreateStudioTraitInput {
  name: string;
  traitType: TraitType;
  pixelData: StudioTraitPixelData;
  paletteSnapshot: string[];
  thumbnailDataUrl?: string | null;
  notes?: string | null;
  status?: StudioTraitStatus;
  projectId?: string | null;
  submittedProposalId?: number | null;
  submittedCandidateSlug?: string | null;
}

export interface UpdateStudioTraitInput {
  name?: string;
  traitType?: TraitType;
  pixelData?: StudioTraitPixelData;
  paletteSnapshot?: string[];
  thumbnailDataUrl?: string | null;
  notes?: string | null;
  status?: StudioTraitStatus;
  projectId?: string | null;
  submittedProposalId?: number | null;
  submittedCandidateSlug?: string | null;
}

// ---------------------------------------------------------------------
// Validation helpers (shared by routes and DB layer)
// ---------------------------------------------------------------------

export const PROJECT_STATUSES: readonly StudioProjectStatus[] = [
  'draft',
  'ready',
  'archived',
] as const;

export const TRAIT_STATUSES: readonly StudioTraitStatus[] = [
  'draft',
  'ready',
  'submitted',
  'archived',
] as const;

export function isTraitType(value: unknown): value is TraitType {
  return typeof value === 'string' && (TRAIT_TYPES as readonly string[]).includes(value);
}

export function isProjectStatus(value: unknown): value is StudioProjectStatus {
  return (
    typeof value === 'string' &&
    (PROJECT_STATUSES as readonly string[]).includes(value)
  );
}

export function isTraitStatus(value: unknown): value is StudioTraitStatus {
  return (
    typeof value === 'string' &&
    (TRAIT_STATUSES as readonly string[]).includes(value)
  );
}
