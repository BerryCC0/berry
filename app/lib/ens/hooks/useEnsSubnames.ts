/**
 * List subnames of a parent ENS name.
 *
 * Hits /api/ens/subnames/[parent] — a server-side proxy to the ENS
 * subgraph. Keeps the subgraph API key off the client.
 */

import { useQuery } from "@tanstack/react-query";
import type { EnsDomain } from "./useEnsDomain";

interface SubnamesResponse {
  parent: string;
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
    staleTime: 60_000,
  });
}
