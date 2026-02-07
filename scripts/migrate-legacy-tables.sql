-- Ponder Migration: Rename colliding tables to legacy_*
-- Run this in the Neon console BEFORE deploying Ponder
--
-- These 6 tables collide with Ponder's onchainTable definitions.
-- Renaming them frees the names for Ponder while keeping existing data accessible.

ALTER TABLE nouns RENAME TO legacy_nouns;
ALTER TABLE voters RENAME TO legacy_voters;
ALTER TABLE proposals RENAME TO legacy_proposals;
ALTER TABLE proposal_versions RENAME TO legacy_proposal_versions;
ALTER TABLE candidates RENAME TO legacy_candidates;
ALTER TABLE candidate_versions RENAME TO legacy_candidate_versions;

-- Also rename indexes that reference old table names (optional but clean)
ALTER INDEX IF EXISTS idx_nouns_settled_at RENAME TO idx_legacy_nouns_settled_at;
ALTER INDEX IF EXISTS idx_nouns_settler RENAME TO idx_legacy_nouns_settler;
ALTER INDEX IF EXISTS idx_nouns_winner RENAME TO idx_legacy_nouns_winner;
ALTER INDEX IF EXISTS idx_nouns_area RENAME TO idx_legacy_nouns_area;
ALTER INDEX IF EXISTS idx_nouns_color_count RENAME TO idx_legacy_nouns_color_count;
ALTER INDEX IF EXISTS idx_nouns_brightness RENAME TO idx_legacy_nouns_brightness;
ALTER INDEX IF EXISTS idx_voters_ens RENAME TO idx_legacy_voters_ens;
ALTER INDEX IF EXISTS idx_voters_ens_gin RENAME TO idx_legacy_voters_ens_gin;
ALTER INDEX IF EXISTS idx_voters_power RENAME TO idx_legacy_voters_power;
ALTER INDEX IF EXISTS idx_voters_address_gin RENAME TO idx_legacy_voters_address_gin;
ALTER INDEX IF EXISTS idx_proposals_title_gin RENAME TO idx_legacy_proposals_title_gin;
ALTER INDEX IF EXISTS idx_proposals_status RENAME TO idx_legacy_proposals_status;
ALTER INDEX IF EXISTS idx_proposals_created RENAME TO idx_legacy_proposals_created;
ALTER INDEX IF EXISTS idx_candidates_title_gin RENAME TO idx_legacy_candidates_title_gin;
ALTER INDEX IF EXISTS idx_candidates_slug RENAME TO idx_legacy_candidates_slug;
ALTER INDEX IF EXISTS idx_candidates_created RENAME TO idx_legacy_candidates_created;
