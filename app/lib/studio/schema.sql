-- =====================================================================
-- Berry Studio — wallet-scoped persistence schema
-- =====================================================================
--
-- Apply manually against the Railway Postgres database used by Berry OS.
-- This repo does not use a migration framework; app tables are created
-- by running these statements with psql or the Railway SQL console.
--
-- All statements are idempotent (IF NOT EXISTS), so re-running is safe.
--
-- Connect:
--   psql "$DATABASE_URL"
-- Apply:
--   \i app/lib/studio/schema.sql
-- =====================================================================

-- gen_random_uuid() requires pgcrypto (already enabled in the Berry DB,
-- but guard for fresh environments).
CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- ---------------------------------------------------------------------
-- studio_projects — full 5-layer Noun designs
--
-- layers (jsonb): {
--   head:       { paletteIndex, pixels:number[1024], edited, source? },
--   body:       { ... },
--   accessory:  { ... },
--   glasses:    { ... },
--   background: { ... }
-- }
-- palette_snapshot (jsonb): string[] of hex colors active when the
--   project was saved.
-- custom_palette  (jsonb, nullable): user-supplied palette overriding
--   the snapshot, if any.
-- status: 'draft' | 'ready' | 'archived'
-- ---------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS studio_projects (
  id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  wallet              TEXT NOT NULL,
  name                TEXT NOT NULL,
  layers              JSONB NOT NULL,
  palette_snapshot    JSONB NOT NULL,
  custom_palette      JSONB,
  thumbnail_data_url  TEXT,
  notes               TEXT,
  status              TEXT NOT NULL DEFAULT 'draft',
  created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at          TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_studio_projects_wallet_status
  ON studio_projects(wallet, status);

-- ---------------------------------------------------------------------
-- studio_traits — single-layer publishable units
--
-- pixel_data (jsonb): { paletteIndex:number, pixels:number[1024] }
-- palette_snapshot (jsonb): string[] of hex colors active when the
--   trait was saved.
-- trait_type: 'head' | 'body' | 'accessory' | 'glasses' | 'background'
-- status: 'draft' | 'ready' | 'submitted' | 'archived'
-- project_id (nullable): the studio_projects.id this trait was
--   extracted from. Not a FK so projects can be deleted without
--   cascading away history.
-- ---------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS studio_traits (
  id                          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  wallet                      TEXT NOT NULL,
  name                        TEXT NOT NULL,
  trait_type                  TEXT NOT NULL,
  pixel_data                  JSONB NOT NULL,
  palette_snapshot            JSONB NOT NULL,
  thumbnail_data_url          TEXT,
  notes                       TEXT,
  status                      TEXT NOT NULL DEFAULT 'draft',
  project_id                  UUID,
  submitted_proposal_id       BIGINT,
  submitted_candidate_slug    TEXT,
  created_at                  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at                  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_studio_traits_wallet_status
  ON studio_traits(wallet, status);

CREATE INDEX IF NOT EXISTS idx_studio_traits_project
  ON studio_traits(project_id);
