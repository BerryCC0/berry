/**
 * Names owned by an address.
 *
 * Hits /api/ens/names-for-address/[address] — a server-side proxy to the
 * ENS subgraph. The subgraph API key never reaches the browser.
 */

import { useQuery } from "@tanstack/react-query";

export interface MyEnsName {
  node: string;
  name: string | null;
  label: string | null;
  parent: string | null;
  owner: string | null;
  registrant: string | null;
  wrappedOwner: string | null;
  resolver: string | null;
  /** bigint as string (seconds since epoch). */
  expiry: string | null;
  isWrapped: boolean;
  fuses: number | null;
}

interface NamesForAddressResponse {
  address: string;
  names: MyEnsName[];
}

export function useMyEnsNames(address: string | undefined) {
  return useQuery<MyEnsName[]>({
    queryKey: ["ens", "names-for-address", address],
    queryFn: async () => {
      const res = await fetch(`/api/ens/names-for-address/${address!.toLowerCase()}`);
      if (!res.ok) throw new Error(`Failed to fetch names: ${res.status}`);
      const data = (await res.json()) as NamesForAddressResponse;
      return data.names;
    },
    enabled: !!address && address.startsWith("0x") && address.length === 42,
    staleTime: 60_000,
  });
}
