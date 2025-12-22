-- Berry OS Database Schema
-- Run this in your Neon database console

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

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

-- Index for public theme gallery
CREATE INDEX IF NOT EXISTS idx_custom_themes_public 
  ON custom_themes(is_public, created_at DESC);

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

-- Indexes
CREATE INDEX IF NOT EXISTS idx_wallet_profile ON wallets(profile_id);
CREATE INDEX IF NOT EXISTS idx_wallet_address ON wallets(LOWER(address));
CREATE INDEX IF NOT EXISTS idx_window_states_profile ON window_states(profile_id);
CREATE INDEX IF NOT EXISTS idx_profiles_last_active ON profiles(last_active_at);

-- Ensure only one primary wallet per profile
CREATE UNIQUE INDEX IF NOT EXISTS idx_primary_wallet 
  ON wallets(profile_id) 
  WHERE is_primary = TRUE;

-- Add comment
COMMENT ON TABLE profiles IS 'Berry OS user profiles, identified by linked wallets';
COMMENT ON TABLE wallets IS 'Wallet addresses linked to profiles, supporting multi-wallet identity';
COMMENT ON TABLE user_themes IS 'Custom theme configurations per user';
COMMENT ON TABLE user_settings IS 'System settings and preferences per user';
COMMENT ON TABLE custom_themes IS 'User-created custom themes, optionally public';
COMMENT ON TABLE desktop_layouts IS 'Desktop icon positions and grid settings';
COMMENT ON TABLE dock_configs IS 'Dock pinned apps and preferences';
COMMENT ON TABLE app_states IS 'App-specific persisted state';

