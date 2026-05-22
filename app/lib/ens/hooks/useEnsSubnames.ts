/**
 * List subnames of a parent ENS name.
 *
 * Backed by the ENS subgraph via @ensdomains/ensjs/subgraph. Requires
 * NEXT_PUBLIC_ENS_SUBGRAPH_API_KEY to be set.
 *
 * Used by NameDetail's Subnames section.
 */

import { useQuery } from "@tanstack/react-query";
import { getSubnames } from "@ensdomains/ensjs/subgraph";
import { ensPublicClient } from "@/app/lib/ens/client";
import type { EnsDomain } from "./useEnsDomain";

export function useEnsSubnames(parentName: string | undefined) {
  return useQuery<EnsDomain[]>({
    queryKey: ["ens", "subnames", parentName],
    queryFn: async () => {
      const result = await getSubnames(ensPublicClient(), {
        name: parentName!,
        pageSize: 100,
      });

      return result.map((s) => ({
        node: s.id,
        name: s.name ?? null,
        label: s.labelName ?? null,
        parent: parentName ?? null,
        owner: s.owner ?? null,
        registrant: null,
        wrappedOwner: s.wrappedOwner ?? null,
        resolver: null,
        expiry: s.expiryDate?.value ? String(s.expiryDate.value) : null,
        isWrapped: Boolean(s.wrappedOwner),
        fuses: typeof s.fuses === "number" ? s.fuses : null,
      }));
    },
    enabled: !!parentName && parentName.includes("."),
    staleTime: 60_000,
  });
}
