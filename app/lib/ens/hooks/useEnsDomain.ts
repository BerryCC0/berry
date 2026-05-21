/**
 * Read the full indexed state for an ENS name.
 *
 * Backed by /api/ens/domain/[name] which queries our Ponder-indexed
 * ens_domains table. Returns null if the name hasn't been observed by
 * the indexer yet — in that case callers should fall back to the
 * on-chain hooks (useEnsOwner, useEnsExpiry, etc.).
 *
 * This is the preferred read path for views that need multiple fields
 * at once (NameDetail's header, MyNames list rows) — one round-trip
 * instead of several.
 */

import { useQuery } from "@tanstack/react-query";

export interface EnsDomain {
  node: string;
  name: string | null;
  label: string | null;
  parent: string | null;
  owner: string | null;
  registrant: string | null;
  wrappedOwner: string | null;
  resolver: string | null;
  /** bigint as string. */
  expiry: string | null;
  isWrapped: boolean;
  /** NameWrapper fuse bitfield. Decode with decodeFuses from @ensdomains/ensjs/utils. */
  fuses: number | null;
}

interface DomainResponse {
  name: string;
  node: string;
  domain: EnsDomain | null;
}

export function useEnsDomain(name: string | undefined) {
  return useQuery<EnsDomain | null>({
    queryKey: ["ens", "domain", name],
    queryFn: async () => {
      const res = await fetch(`/api/ens/domain/${encodeURIComponent(name!)}`);
      if (!res.ok) throw new Error(`Failed to fetch domain: ${res.status}`);
      const data = (await res.json()) as DomainResponse;
      return data.domain;
    },
    enabled: !!name && name.includes("."),
    staleTime: 30_000,
  });
}
