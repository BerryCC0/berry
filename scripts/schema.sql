-- Berry OS Database Schema
-- Run with: npx tsx scripts/run-schema.ts
-- Or paste directly in your Neon console

-- =====================================================
-- EXTENSIONS
-- =====================================================
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Enable pg_trgm extension for partial text search (ILIKE with trigram indexes)
CREATE EXTENSION IF NOT EXISTS "pg_trgm";

-- =====================================================
-- CORE BERRY OS TABLES
-- =====================================================

-- Profiles table
CREATE TABLE IF NOT EXISTS profiles (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  last_active_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Wallets table (many-to-one with profiles)
CREATE TABLE IF NOT EXISTS wallets (
  address VARCHAR(66) NOT NULL,
  chain VARCHAR(20) NOT NULL,
  chain_id INTEGER NOT NULL,
  profile_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  is_primary BOOLEAN DEFAULT FALSE,
  label VARCHAR(100),
  linked_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  PRIMARY KEY (address, chain)
);

-- User themes
CREATE TABLE IF NOT EXISTS user_themes (
  profile_id UUID PRIMARY KEY REFERENCES profiles(id) ON DELETE CASCADE,
  theme_data JSONB NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- User settings (system preferences)
CREATE TABLE IF NOT EXISTS user_settings (
  profile_id UUID PRIMARY KEY REFERENCES profiles(id) ON DELETE CASCADE,
  settings_data JSONB NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Custom themes (user-created)
CREATE TABLE IF NOT EXISTS custom_themes (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  profile_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  name VARCHAR(100) NOT NULL,
  theme_data JSONB NOT NULL,
  is_public BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Desktop layouts
CREATE TABLE IF NOT EXISTS desktop_layouts (
  profile_id UUID PRIMARY KEY REFERENCES profiles(id) ON DELETE CASCADE,
  layout_data JSONB NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Window states
CREATE TABLE IF NOT EXISTS window_states (
  id SERIAL PRIMARY KEY,
  profile_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  window_id VARCHAR(50) NOT NULL,
  state_data JSONB NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Dock configurations
CREATE TABLE IF NOT EXISTS dock_configs (
  profile_id UUID PRIMARY KEY REFERENCES profiles(id) ON DELETE CASCADE,
  config_data JSONB NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- App-specific state
CREATE TABLE IF NOT EXISTS app_states (
  profile_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  app_id VARCHAR(50) NOT NULL,
  state_data JSONB NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  PRIMARY KEY (profile_id, app_id)
);

-- =====================================================
-- SHORT LINKS TABLE
-- =====================================================

-- Short links for sharing deep links
CREATE TABLE IF NOT EXISTS short_links (
  id VARCHAR(20) PRIMARY KEY,                      -- Short ID (e.g., "abc123")
  full_path TEXT NOT NULL,                         -- Full deep link path
  metadata JSONB,                                  -- Optional metadata
  expires_at TIMESTAMP WITH TIME ZONE,             -- Optional expiration
  click_count INTEGER DEFAULT 0,                   -- Analytics
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- =====================================================
-- NOUNS DAO TABLES
-- =====================================================

-- All historical Nouns with pre-rendered SVGs
CREATE TABLE IF NOT EXISTS nouns (
  id INTEGER PRIMARY KEY,                          -- Token ID
  
  -- Seed traits
  background INTEGER NOT NULL,
  body INTEGER NOT NULL,
  accessory INTEGER NOT NULL,
  head INTEGER NOT NULL,
  glasses INTEGER NOT NULL,
  
  -- Pre-rendered SVG (avoid client-side rendering)
  svg TEXT NOT NULL,
  
  -- Settler info (who called settleCurrentAndCreateNewAuction)
  settled_by_address VARCHAR(42),                   -- Address that settled the auction
  settled_by_ens VARCHAR(255),                     -- ENS name (if resolved)
  settled_at TIMESTAMP WITH TIME ZONE,             -- When auction was settled
  settled_tx_hash VARCHAR(66),                     -- Transaction hash
  
  -- Auction winner (who won the bid)
  winning_bid NUMERIC(78, 0),                      -- Wei (NULL for Nounder nouns)
  winner_address VARCHAR(42),                      -- Winning bidder address
  winner_ens VARCHAR(255),                         -- Winner's ENS (if resolved)
  
  -- Computed metrics (for Probe sort filters)
  area INTEGER,                                    -- Total non-transparent pixels
  color_count INTEGER,                             -- Unique palette colors used
  brightness INTEGER,                              -- Average perceived brightness (0-255)
  
  -- Metadata
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Proposal drafts for Camp governance app
CREATE TABLE IF NOT EXISTS proposal_drafts (
  id SERIAL PRIMARY KEY,
  wallet_address VARCHAR(42) NOT NULL,             -- Creator wallet address
  draft_slug VARCHAR(100) NOT NULL,                -- Unique slug per user
  draft_title VARCHAR(200) NOT NULL DEFAULT 'Untitled',
  title VARCHAR(500),                              -- Proposal title
  description TEXT,                                -- Proposal description (markdown)
  actions JSONB DEFAULT '[]',                      -- Flattened proposal actions
  action_templates JSONB DEFAULT '[]',             -- Template states for editor
  proposal_type VARCHAR(20) DEFAULT 'standard',    -- standard, timelock_v1, candidate
  kyc_verified BOOLEAN DEFAULT FALSE,              -- Whether KYC is complete
  kyc_inquiry_id VARCHAR(100),                     -- Persona inquiry ID
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  
  -- Unique constraint for upsert
  UNIQUE (wallet_address, draft_slug)
);

-- =====================================================
-- CAMP SEARCH TABLES
-- =====================================================

-- Voters (delegates) with cached ENS names for partial search
CREATE TABLE IF NOT EXISTS voters (
  address VARCHAR(42) PRIMARY KEY,                 -- Ethereum address (lowercase)
  ens_name VARCHAR(255),                           -- Resolved ENS name
  delegated_votes INTEGER DEFAULT 0,               -- Current voting power
  nouns_represented INTEGER[] DEFAULT '{}',        -- Array of Noun IDs
  total_votes INTEGER DEFAULT 0,                   -- Total votes cast
  first_seen_at TIMESTAMP WITH TIME ZONE,          -- First activity timestamp
  last_vote_at TIMESTAMP WITH TIME ZONE,           -- Last vote timestamp
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Proposals (cached from Goldsky for search)
CREATE TABLE IF NOT EXISTS proposals (
  id INTEGER PRIMARY KEY,
  title TEXT NOT NULL,
  description TEXT,
  status VARCHAR(50) NOT NULL,
  proposer VARCHAR(42) NOT NULL,
  for_votes INTEGER DEFAULT 0,
  against_votes INTEGER DEFAULT 0,
  abstain_votes INTEGER DEFAULT 0,
  quorum_votes INTEGER DEFAULT 0,
  start_block BIGINT,
  end_block BIGINT,
  created_timestamp BIGINT,
  execution_eta BIGINT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Proposal versions (version history)
CREATE TABLE IF NOT EXISTS proposal_versions (
  id VARCHAR(100) PRIMARY KEY,                     -- Goldsky version ID
  proposal_id INTEGER NOT NULL REFERENCES proposals(id) ON DELETE CASCADE,
  version_number INTEGER NOT NULL,
  title TEXT,
  description TEXT,
  update_message TEXT,
  created_at BIGINT NOT NULL,                      -- Block timestamp
  synced_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Candidates (proposal candidates)
CREATE TABLE IF NOT EXISTS candidates (
  id VARCHAR(255) PRIMARY KEY,                     -- proposer-slug
  slug VARCHAR(255) NOT NULL,
  proposer VARCHAR(42) NOT NULL,
  title TEXT,
  description TEXT,
  canceled BOOLEAN DEFAULT FALSE,
  created_timestamp BIGINT,
  last_updated_timestamp BIGINT,
  signature_count INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Candidate versions (version history)
CREATE TABLE IF NOT EXISTS candidate_versions (
  id VARCHAR(255) PRIMARY KEY,                     -- Goldsky version ID
  candidate_id VARCHAR(255) NOT NULL REFERENCES candidates(id) ON DELETE CASCADE,
  version_number INTEGER NOT NULL,
  title TEXT,
  description TEXT,
  update_message TEXT,
  created_at BIGINT NOT NULL,                      -- Block timestamp
  synced_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Sync state tracking
CREATE TABLE IF NOT EXISTS sync_state (
  key VARCHAR(50) PRIMARY KEY,
  value TEXT NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- KYC verifications (server-side Persona webhook data)
CREATE TABLE IF NOT EXISTS kyc_verifications (
  id SERIAL PRIMARY KEY,
  inquiry_id VARCHAR(100) UNIQUE NOT NULL,           -- Persona inquiry ID
  reference_id VARCHAR(255),                          -- Reference ID from SDK
  wallet_address VARCHAR(42),                         -- Recipient wallet address
  status VARCHAR(50) NOT NULL,                        -- Persona inquiry status
  verified_at TIMESTAMP WITH TIME ZONE,               -- When verification completed
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- =====================================================
-- INDEXES
-- =====================================================

-- Core indexes
CREATE INDEX IF NOT EXISTS idx_wallet_profile ON wallets(profile_id);
CREATE INDEX IF NOT EXISTS idx_wallet_address ON wallets(LOWER(address));
CREATE INDEX IF NOT EXISTS idx_window_states_profile ON window_states(profile_id);
CREATE INDEX IF NOT EXISTS idx_profiles_last_active ON profiles(last_active_at);
CREATE INDEX IF NOT EXISTS idx_custom_themes_public ON custom_themes(is_public, created_at DESC);

-- Ensure only one primary wallet per profile
CREATE UNIQUE INDEX IF NOT EXISTS idx_primary_wallet 
  ON wallets(profile_id) 
  WHERE is_primary = TRUE;

-- Short links indexes
CREATE INDEX IF NOT EXISTS idx_short_links_created ON short_links(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_short_links_expires ON short_links(expires_at) WHERE expires_at IS NOT NULL;

-- Nouns indexes
CREATE INDEX IF NOT EXISTS idx_nouns_settled_at ON nouns(settled_at DESC);
CREATE INDEX IF NOT EXISTS idx_nouns_settler ON nouns(settled_by_address);
CREATE INDEX IF NOT EXISTS idx_nouns_winner ON nouns(winner_address);
CREATE INDEX IF NOT EXISTS idx_nouns_area ON nouns(area);
CREATE INDEX IF NOT EXISTS idx_nouns_color_count ON nouns(color_count DESC);
CREATE INDEX IF NOT EXISTS idx_nouns_brightness ON nouns(brightness DESC);

-- Proposal drafts indexes
CREATE INDEX IF NOT EXISTS idx_proposal_drafts_wallet ON proposal_drafts(wallet_address);
CREATE INDEX IF NOT EXISTS idx_proposal_drafts_updated ON proposal_drafts(updated_at DESC);

-- Camp search indexes (with trigram support for partial matching)
CREATE INDEX IF NOT EXISTS idx_voters_ens ON voters(LOWER(ens_name));
CREATE INDEX IF NOT EXISTS idx_voters_ens_gin ON voters USING gin(LOWER(ens_name) gin_trgm_ops);
CREATE INDEX IF NOT EXISTS idx_voters_power ON voters(delegated_votes DESC);
CREATE INDEX IF NOT EXISTS idx_voters_address_gin ON voters USING gin(LOWER(address) gin_trgm_ops);

CREATE INDEX IF NOT EXISTS idx_proposals_title_gin ON proposals USING gin(LOWER(title) gin_trgm_ops);
CREATE INDEX IF NOT EXISTS idx_proposals_status ON proposals(status);
CREATE INDEX IF NOT EXISTS idx_proposals_created ON proposals(created_timestamp DESC);

CREATE INDEX IF NOT EXISTS idx_candidates_title_gin ON candidates USING gin(LOWER(title) gin_trgm_ops);
CREATE INDEX IF NOT EXISTS idx_candidates_slug ON candidates(slug);
CREATE INDEX IF NOT EXISTS idx_candidates_created ON candidates(created_timestamp DESC);

-- KYC verification indexes
CREATE INDEX IF NOT EXISTS idx_kyc_wallet ON kyc_verifications(LOWER(wallet_address));
CREATE INDEX IF NOT EXISTS idx_kyc_status ON kyc_verifications(status);
CREATE INDEX IF NOT EXISTS idx_kyc_created ON kyc_verifications(created_at DESC);

-- =====================================================
-- COMMENTS
-- =====================================================
COMMENT ON TABLE profiles IS 'Berry OS user profiles, identified by linked wallets';
COMMENT ON TABLE wallets IS 'Wallet addresses linked to profiles, supporting multi-wallet identity';
COMMENT ON TABLE user_themes IS 'Custom theme configurations per user';
COMMENT ON TABLE user_settings IS 'System settings and preferences per user';
COMMENT ON TABLE custom_themes IS 'User-created custom themes, optionally public';
COMMENT ON TABLE desktop_layouts IS 'Desktop icon positions and grid settings';
COMMENT ON TABLE dock_configs IS 'Dock pinned apps and preferences';
COMMENT ON TABLE app_states IS 'App-specific persisted state';
COMMENT ON TABLE short_links IS 'Short URLs for sharing deep links to apps/content';
COMMENT ON TABLE nouns IS 'Cached Nouns with pre-rendered SVGs, traits, and auction info';
COMMENT ON TABLE proposal_drafts IS 'Saved proposal drafts for Camp governance app';
COMMENT ON TABLE voters IS 'Cached Nouns DAO voters (delegates) with ENS names for partial search';
COMMENT ON TABLE proposals IS 'Cached on-chain proposals from Goldsky subgraph';
COMMENT ON TABLE proposal_versions IS 'Version history for proposals (updates tracked)';
COMMENT ON TABLE candidates IS 'Proposal candidates (off-chain proposals seeking sponsorship)';
COMMENT ON TABLE candidate_versions IS 'Version history for candidates (updates tracked)';
COMMENT ON TABLE sync_state IS 'Tracks last sync timestamps for cron jobs';
COMMENT ON TABLE kyc_verifications IS 'Server-side KYC verification records from Persona webhooks';

