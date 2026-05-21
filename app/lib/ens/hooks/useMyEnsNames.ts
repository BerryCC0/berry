/**
 * Names owned by an address.
 *
 * Hits our own /api/ens/names-for-address/[address] route, which queries
 * the ponder_live.ens_domains table (indexed by Berry's own Ponder
 * instance). No third-party subgraph dependency.
 *
 * Captures ownership at all three layers:
 *   - registrant   (ERC-721 .eth 2LDs, unwrapped)
 *   - wrappedOwner (ERC-1155 NameWrapper holdings)
 *   - owner        (Registry-level: DNS imports, subnames)
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
  /** bigint as string (seconds since epoch) — convert via Number() or BigInt(). */
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
