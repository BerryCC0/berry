/**
 * useProbeAddresses Hook
 * Fetches unique settlers and winners from the DB for filter dropdowns.
 * Returns them as SelectOption[] with ENS as label (or truncated address).
 * The value is always the lowercase 0x address so the API filter works
 * regardless of whether the user selects by ENS or address.
 */

'use client';

import { useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import type { SelectOption } from '@/OS/components/Primitives/Select';

interface AddressEntry {
  address: string;
  ens: string | null;
  count: number;
}

interface AddressesResponse {
  settlers: AddressEntry[];
  winners: AddressEntry[];
}

function truncateAddress(addr: string): string {
  if (!addr) return '';
  return `${addr.slice(0, 6)}…${addr.slice(-4)}`;
}

/**
 * Convert address entries to SelectOption[].
 * Label shows ENS if available (with address in parens), or just truncated address.
 * Value is always the lowercase address.
 */
function toAddressOptions(entries: AddressEntry[]): SelectOption[] {
  return entries.map((e) => ({
    value: e.address.toLowerCase(),
    label: e.ens || truncateAddress(e.address),
  }));
}

export function useProbeAddresses() {
  const { data, isLoading } = useQuery<AddressesResponse>({
    queryKey: ['probe', 'addresses'],
    queryFn: async () => {
      const res = await fetch('/api/nouns/addresses');
      if (!res.ok) throw new Error('Failed to fetch addresses');
      return res.json();
    },
    staleTime: 5 * 60 * 1000, // 5 minutes
  });

  const settlerOptions = useMemo(
    () => (data ? toAddressOptions(data.settlers) : []),
    [data]
  );

  const ownerOptions = useMemo(
    () => (data ? toAddressOptions(data.winners) : []),
    [data]
  );

  return { settlerOptions, ownerOptions, isLoading };
}
