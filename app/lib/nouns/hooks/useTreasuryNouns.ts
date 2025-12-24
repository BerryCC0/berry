/**
 * Treasury Nouns Hook
 * Fetch Nouns owned by the treasury
 */

import { useNounsQuery } from './useNounsQuery';
import { NOUNS_ADDRESSES } from '../contracts';

interface TreasuryNoun {
  id: string;
  seed: {
    background: number;
    body: number;
    accessory: number;
    head: number;
    glasses: number;
  };
}

interface TreasuryNounsData {
  nouns: TreasuryNoun[];
}

const TREASURY_NOUNS_QUERY = `
  query TreasuryNouns($owner: ID!) {
    nouns(
      where: { owner: $owner }
      orderBy: id
      orderDirection: desc
      first: 1000
    ) {
      id
      seed {
        background
        body
        accessory
        head
        glasses
      }
    }
  }
`;

/**
 * Fetch Nouns owned by the V2 treasury
 */
export function useTreasuryNouns() {
  const treasuryAddress = NOUNS_ADDRESSES.treasury.toLowerCase();

  return useNounsQuery<TreasuryNounsData>(
    ['treasury-nouns', treasuryAddress],
    TREASURY_NOUNS_QUERY,
    { owner: treasuryAddress }
  );
}

/**
 * Fetch Nouns owned by the V1 treasury
 */
export function useTreasuryV1Nouns() {
  const treasuryV1Address = NOUNS_ADDRESSES.treasuryV1.toLowerCase();

  return useNounsQuery<TreasuryNounsData>(
    ['treasury-v1-nouns', treasuryV1Address],
    TREASURY_NOUNS_QUERY,
    { owner: treasuryV1Address }
  );
}

export type { TreasuryNoun };

