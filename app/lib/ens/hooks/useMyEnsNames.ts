/**
 * Names owned by an address.
 *
 * Backed by the ENS subgraph via @ensdomains/ensjs/subgraph. The Graph
 * deprecated the hosted service in mid-2024, so this requires
 * NEXT_PUBLIC_ENS_SUBGRAPH_API_KEY to be set (free tier covers ~100k
 * queries/month — plenty for Berry).
 *
 * Captures ownership at all three layers:
 *   - registrant   (ERC-721 .eth 2LDs, unwrapped)
 *   - wrappedOwner (ERC-1155 NameWrapper holdings)
 *   - owner        (Registry-level: DNS imports, subnames)
 *
 * The hook returns a flat MyEnsName[] shape so consumers don't have to
 * unpack ensjs's NameWithRelation type directly.
 */

import { useQuery } from "@tanstack/react-query";
import { getNamesForAddress } from "@ensdomains/ensjs/subgraph";
import { ensPublicClient } from "@/app/lib/ens/client";

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

export function useMyEnsNames(address: string | undefined) {
  return useQuery<MyEnsName[]>({
    queryKey: ["ens", "names-for-address", address],
    queryFn: async () => {
      const result = await getNamesForAddress(ensPublicClient(), {
        address: address as `0x${string}`,
        pageSize: 100,
        filter: {
          owner: true,
          registrant: true,
          wrappedOwner: true,
          resolvedAddress: false,
          allowExpired: false,
          allowDeleted: false,
          allowReverseRecord: false,
        },
      });

      return result.map((n) => ({
        node: n.id,
        name: n.name ?? null,
        label: n.labelName ?? null,
        parent: n.parentName ?? null,
        owner: n.owner ?? null,
        registrant: n.registrant ?? null,
        wrappedOwner: n.wrappedOwner ?? null,
        resolver: null,
        expiry: n.expiryDate?.value ? String(n.expiryDate.value) : null,
        isWrapped: Boolean(n.wrappedOwner),
        fuses: typeof n.fuses === "number" ? n.fuses : null,
      }));
    },
    enabled: !!address && address.startsWith("0x") && address.length === 42,
    staleTime: 60_000,
  });
}
