/**
 * Client Metadata Hook
 * Resolves favicons and website meta for each client.
 * NFT images come from Ponder (ClientData.nftImage) -- not fetched here.
 */

'use client';

import { useQuery } from '@tanstack/react-query';
import type { ClientData, ClientMetadataEntry, ClientMetadataMap } from '../types';
import { getClientUrl } from '@/OS/lib/clientNames';

// ============================================================================
// Fetcher
// ============================================================================

async function fetchMetadataForClient(
  url: string,
): Promise<ClientMetadataEntry | null> {
  const params = new URLSearchParams({ url });
  const resp = await fetch(`/api/clients/metadata?${params.toString()}`);
  if (!resp.ok) return null;
  return resp.json();
}

async function fetchAllClientMetadata(
  clients: ClientData[],
): Promise<ClientMetadataMap> {
  const entries = await Promise.allSettled(
    clients
      .map((client) => {
        const url = getClientUrl(client.clientId, client.description);
        if (!url) return null;
        return { clientId: client.clientId, url };
      })
      .filter(Boolean)
      .map(async (item) => {
        const metadata = await fetchMetadataForClient(item!.url);
        return [item!.clientId, metadata] as const;
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
 * Fetches website metadata (favicon, title, description) for all clients.
 * Results are cached for 1 hour since favicons rarely change.
 * NFT images are NOT fetched here -- they come from ClientData.nftImage (Ponder).
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
