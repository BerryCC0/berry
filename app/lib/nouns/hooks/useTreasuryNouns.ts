/**
 * Treasury Nouns Hook
 * Fetch Nouns owned by the treasury from Ponder API
 */

'use client';

import { useQuery } from '@tanstack/react-query';
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

async function fetchNounsByOwner(ownerAddress: string): Promise<TreasuryNounsData> {
  const params = new URLSearchParams({
    owner: ownerAddress,
    limit: '100',
    sort: 'newest',
  });

  const response = await fetch(`/api/nouns?${params}`);
  if (!response.ok) throw new Error('Failed to fetch treasury nouns');

  const json = await response.json();
  const nouns: TreasuryNoun[] = (json.nouns || []).map((n: any) => ({
    id: String(n.id),
    seed: {
      background: n.background,
      body: n.body,
      accessory: n.accessory,
      head: n.head,
      glasses: n.glasses,
    },
  }));

  return { nouns };
}

/**
 * Fetch Nouns owned by the V2 treasury
 */
export function useTreasuryNouns() {
  const treasuryAddress = NOUNS_ADDRESSES.treasury.toLowerCase();

  return useQuery<TreasuryNounsData>({
    queryKey: ['treasury-nouns', treasuryAddress],
    queryFn: () => fetchNounsByOwner(treasuryAddress),
  });
}

/**
 * Fetch Nouns owned by the V1 treasury
 */
export function useTreasuryV1Nouns() {
  const treasuryV1Address = NOUNS_ADDRESSES.treasuryV1.toLowerCase();

  return useQuery<TreasuryNounsData>({
    queryKey: ['treasury-v1-nouns', treasuryV1Address],
    queryFn: () => fetchNounsByOwner(treasuryV1Address),
  });
}

export type { TreasuryNoun };
