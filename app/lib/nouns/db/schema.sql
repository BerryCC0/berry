-- Nouns Database Schema
-- NOTE: This is included in scripts/schema.sql - run that for full setup
-- This file is kept for reference and documentation

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

-- Indexes for common queries
CREATE INDEX IF NOT EXISTS idx_nouns_settled_at ON nouns(settled_at DESC);
CREATE INDEX IF NOT EXISTS idx_nouns_settler ON nouns(settled_by_address);
CREATE INDEX IF NOT EXISTS idx_nouns_winner ON nouns(winner_address);

COMMENT ON TABLE nouns IS 'Cached Nouns with pre-rendered SVGs, traits, and auction info';
