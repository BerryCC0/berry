-- Berry OS Database Schema
-- Run with: npx tsx scripts/run-schema.ts
-- Or paste directly in your Neon console

-- =====================================================
-- EXTENSIONS
-- =====================================================
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

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
  settled_by_address VARCHAR(42) NOT NULL,         -- Address that settled the auction
  settled_by_ens VARCHAR(255),                     -- ENS name (if resolved)
  settled_at TIMESTAMP WITH TIME ZONE NOT NULL,    -- When auction was settled
  settled_tx_hash VARCHAR(66) NOT NULL,            -- Transaction hash
  
  -- Auction winner (who won the bid)
  winning_bid NUMERIC(78, 0),                      -- Wei (NULL for Nounder nouns)
  winner_address VARCHAR(42),                      -- Winning bidder address
  winner_ens VARCHAR(255),                         -- Winner's ENS (if resolved)
  
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

-- Proposal drafts indexes
CREATE INDEX IF NOT EXISTS idx_proposal_drafts_wallet ON proposal_drafts(wallet_address);
CREATE INDEX IF NOT EXISTS idx_proposal_drafts_updated ON proposal_drafts(updated_at DESC);

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

