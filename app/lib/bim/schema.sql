-- ============================================================================
-- BIM (Berry Instant Messaging) Database Schema
-- Stores server/channel metadata, member roles, and user profiles.
-- All message content lives in XMTP (E2EE) — never in our database.
-- ============================================================================

-- User profiles for display names, avatars, and XMTP identity
CREATE TABLE IF NOT EXISTS bim_profiles (
  wallet_address  VARCHAR(42) PRIMARY KEY,
  display_name    VARCHAR(50),
  avatar_url      TEXT,
  status          TEXT,
  xmtp_inbox_id   TEXT,
  created_at      TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at      TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Servers (logical groupings of channels)
CREATE TABLE IF NOT EXISTS bim_servers (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name            VARCHAR(100) NOT NULL,
  description     TEXT,
  icon_url        TEXT,
  owner_address   VARCHAR(42) NOT NULL,
  invite_code     VARCHAR(20) UNIQUE,
  is_token_gated  BOOLEAN DEFAULT FALSE,
  token_gate_config JSONB,
  created_at      TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at      TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Channels (each maps to one XMTP group chat)
CREATE TABLE IF NOT EXISTS bim_channels (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  server_id       UUID NOT NULL REFERENCES bim_servers(id) ON DELETE CASCADE,
  name            VARCHAR(100) NOT NULL,
  description     TEXT,
  xmtp_group_id   TEXT,
  position        INTEGER DEFAULT 0,
  is_default      BOOLEAN DEFAULT FALSE,
  created_at      TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_bim_channels_server ON bim_channels(server_id);

-- Server members
CREATE TABLE IF NOT EXISTS bim_server_members (
  server_id       UUID NOT NULL REFERENCES bim_servers(id) ON DELETE CASCADE,
  wallet_address  VARCHAR(42) NOT NULL,
  role            VARCHAR(20) DEFAULT 'member',  -- owner, admin, member
  nickname        VARCHAR(50),
  joined_at       TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  PRIMARY KEY (server_id, wallet_address)
);

CREATE INDEX IF NOT EXISTS idx_bim_members_wallet ON bim_server_members(wallet_address);

-- Push notification subscriptions
CREATE TABLE IF NOT EXISTS bim_push_subscriptions (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  wallet_address  VARCHAR(42) NOT NULL,
  endpoint        TEXT NOT NULL,
  p256dh_key      TEXT NOT NULL,
  auth_key        TEXT NOT NULL,
  created_at      TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(wallet_address, endpoint)
);

CREATE INDEX IF NOT EXISTS idx_bim_push_wallet ON bim_push_subscriptions(wallet_address);
