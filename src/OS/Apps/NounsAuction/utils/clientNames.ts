/**
 * Client Names Mapping
 * Maps client IDs to their display names
 */

import { BERRY_CLIENT_ID } from '@/app/lib/nouns/constants';

// Known client IDs from Nouns ecosystem
export const CLIENT_NAMES: Record<number, string> = {
  1: 'Noundry',
  2: 'House of Nouns',
  3: 'Camp',
  4: 'Nouns.biz',
  5: 'NounSwap',
  6: 'Nouns.game',
  7: 'Nouns Terminal',
  8: 'Nouns Esports',
  9: 'Probe',
  10: 'Agora',
  11: 'Berry OS',
  16: 'Lighthouse',
  18: 'ANouns',
  22: 'Nouncil',
};

/**
 * Get client display name from ID
 */
export function getClientName(clientId: number | null | undefined): string | null {
  if (clientId === null || clientId === undefined) {
    return null;
  }
  return CLIENT_NAMES[clientId] || `Client ${clientId}`;
}

/**
 * Check if bid was made through Berry OS
 */
export function isBerryOSBid(clientId: number | null | undefined): boolean {
  return clientId === BERRY_CLIENT_ID;
}

