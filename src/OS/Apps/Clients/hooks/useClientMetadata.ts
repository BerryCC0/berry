/**
 * Client Metadata Hook
 * Resolves favicons, website meta, and NFT images for each client.
 */

'use client';

import { useQuery } from '@tanstack/react-query';
import type { ClientData } from './useClientIncentives';
import { getClientUrl } from '@/OS/lib/clientNames';

// ============================================================================
// Types
// ============================================================================

export interface ClientMetadataEntry {
  favicon?: string;
  title?: string;
  description?: string;
  nftImage?: string;
}

export type ClientMetadataMap = Map<number, ClientMetadataEntry>;

// ============================================================================
// Fetcher
// ============================================================================

async function fetchMetadataForClient(
  clientId: number,
  url: string | null,
): Promise<ClientMetadataEntry | null> {
  const params = new URLSearchParams();
  if (url) params.set('url', url);
  params.set('tokenId', String(clientId));

  if (!params.toString()) return null;

  const resp = await fetch(`/api/clients/metadata?${params.toString()}`);
  if (!resp.ok) return null;
  return resp.json();
}

async function fetchAllClientMetadata(
  clients: ClientData[],
): Promise<ClientMetadataMap> {
  const entries = await Promise.allSettled(
    clients.map(async (client) => {
      const url = getClientUrl(client.clientId, client.description);
      const metadata = await fetchMetadataForClient(client.clientId, url);
      return [client.clientId, metadata] as const;
    }),
  );

  const map = new Map<number, ClientMetadataEntry>();
  for (const entry of entries) {
    if (entry.status === 'fulfilled' && entry.value[1]) {
      map.set(entry.value[0], entry.value[1]);
    }
  }
  return map;
}

// ============================================================================
// Hook
// ============================================================================

/**
 * Fetches metadata (favicon, title, description, NFT image) for all clients.
 * Results are cached for 1 hour since favicons/NFT images rarely change.
 */
export function useClientMetadata(clients: ClientData[] | undefined) {
  return useQuery<ClientMetadataMap>({
    queryKey: ['client-metadata', clients?.map((c) => c.clientId).sort()],
    queryFn: () => fetchAllClientMetadata(clients!),
    enabled: !!clients?.length,
    staleTime: 3600000, // 1 hour
    gcTime: 3600000,
  });
}
