/**
 * List subnames of a parent ENS name.
 *
 * Backed by /api/ens/subnames/[parent] which queries our Ponder-indexed
 * ens_domains table for rows whose `parent` equals namehash(parentName).
 *
 * Used by NameDetail's Subnames section. Only returns indexed subnames —
 * if the indexer hasn't seen a NewOwner event for a subname yet, it
 * won't show up. (For most cases this is fine; the indexer catches
 * subname creation in real time once synced.)
 */

import { useQuery } from "@tanstack/react-query";
import type { EnsDomain } from "./useEnsDomain";

interface SubnamesResponse {
  parent: string;
  parentNode: string;
  subnames: EnsDomain[];
}

export function useEnsSubnames(parentName: string | undefined) {
  return useQuery<EnsDomain[]>({
    queryKey: ["ens", "subnames", parentName],
    queryFn: async () => {
      const res = await fetch(`/api/ens/subnames/${encodeURIComponent(parentName!)}`);
      if (!res.ok) throw new Error(`Failed to fetch subnames: ${res.status}`);
      const data = (await res.json()) as SubnamesResponse;
      return data.subnames;
    },
    enabled: !!parentName && parentName.includes("."),
    staleTime: 30_000,
  });
}
