/**
 * Client Registry
 * Maps client IDs to their display names, URLs, and other metadata
 */

import { BERRY_CLIENT_ID } from '@/app/lib/nouns/constants';

// ============================================================================
// Types
// ============================================================================

export interface ClientInfo {
  name: string;
  url?: string; // override URL when on-chain description isn't a clean URL
}

// ============================================================================
// Registry
// ============================================================================

export const CLIENT_REGISTRY: Record<number, ClientInfo> = {
  1:  { name: 'Noundry',        url: 'https://noundry.wtf' },
  2:  { name: 'House of Nouns', url: 'https://houseofnouns.wtf' },
  3:  { name: 'Camp',           url: 'https://nouns.camp' },
  4:  { name: 'Nouns.biz',      url: 'https://nouns.biz' },
  5:  { name: 'Nouns.com',       url: 'https://nouns.com' },
  6:  { name: 'Nouns.game',     url: 'https://nouns.game' },
  7:  { name: 'Nouns Terminal', url: 'https://nouns.sh' },
  8:  { name: 'Nouns Esports',  url: 'https://nouns.gg' },
  9:  { name: 'Probe',          url: 'https://probe.wtf' },
  10: { name: 'Agora',          url: 'https://nounsagora.com' },
  11: { name: 'Berry OS',       url: 'https://berryos.wtf' },
  16: { name: 'Lighthouse' },
  18: { name: 'ANouns' },
  22: { name: 'Nouncil',        url: 'https://nouncil.club' },
};

// Backwards-compatible flat name map derived from registry
export const CLIENT_NAMES: Record<number, string> = Object.fromEntries(
  Object.entries(CLIENT_REGISTRY).map(([id, info]) => [Number(id), info.name]),
);

// ============================================================================
// Helpers
// ============================================================================

/**
 * Get client display name from ID
 */
export function getClientName(clientId: number | null | undefined): string | null {
  if (clientId === null || clientId === undefined) {
    return null;
  }
  return CLIENT_REGISTRY[clientId]?.name || `Client ${clientId}`;
}

/**
 * Get client URL from registry or description field.
 * The on-chain description often contains a URL (e.g. "nouns95.wtf").
 */
export function getClientUrl(clientId: number, description?: string): string | null {
  // Prefer registry URL
  const registryUrl = CLIENT_REGISTRY[clientId]?.url;
  if (registryUrl) return registryUrl;

  // Try to parse URL from description
  if (description) {
    const trimmed = description.trim();
    if (!trimmed) return null;

    // Already a full URL
    if (/^https?:\/\//i.test(trimmed)) return trimmed;

    // Looks like a domain (contains a dot, no spaces)
    if (/^[^\s]+\.[a-z]{2,}$/i.test(trimmed)) return `https://${trimmed}`;
  }

  return null;
}

/**
 * Check if action was made through Berry OS
 */
export function isBerryOSClient(clientId: number | null | undefined): boolean {
  return clientId === BERRY_CLIENT_ID;
}
