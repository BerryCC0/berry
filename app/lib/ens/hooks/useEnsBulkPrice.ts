/**
 * Sum the registration/renewal price across multiple names.
 *
 * ensjs's `getPrice` accepts `nameOrNames: string | string[]` and returns
 * either a single `{ base, premium }` or an array (one entry per name).
 * This hook always passes an array and aggregates the result so callers
 * get one total + an itemized breakdown.
 *
 * Used by the bulk-renew action in MyNames and the multi-name register
 * flow if we ever support it.
 */

import { useQuery } from "@tanstack/react-query";
import { getPrice } from "@ensdomains/ensjs/public";
import { ensPublicClient } from "@/app/lib/ens/client";

const ONE_YEAR_SECONDS = 365 * 24 * 60 * 60;

export interface PriceBreakdownEntry {
  name: string;
  base: bigint;
  premium: bigint;
  total: bigint;
}

export interface BulkPrice {
  /** Sum of base + premium across every name. Send this as `value` on renew. */
  total: bigint;
  base: bigint;
  premium: bigint;
  items: PriceBreakdownEntry[];
}

export function useEnsBulkPrice(
  names: string[] | undefined,
  durationSeconds: number = ONE_YEAR_SECONDS,
) {
  return useQuery<BulkPrice>({
    queryKey: ["ens", "bulk-price", names, durationSeconds],
    queryFn: async () => {
      const result = await getPrice(ensPublicClient(), {
        nameOrNames: names!,
        duration: BigInt(durationSeconds),
      });

      // ensjs returns an array when nameOrNames is an array. Normalize.
      const entries = Array.isArray(result) ? result : [result];

      let totalBase = BigInt(0);
      let totalPremium = BigInt(0);
      const items: PriceBreakdownEntry[] = entries.map((e, i) => {
        const base = e.base;
        const premium = e.premium;
        totalBase += base;
        totalPremium += premium;
        return {
          name: names![i]!,
          base,
          premium,
          total: base + premium,
        };
      });

      return {
        total: totalBase + totalPremium,
        base: totalBase,
        premium: totalPremium,
        items,
      };
    },
    enabled: !!names && names.length > 0 && durationSeconds > 0,
    staleTime: 30_000,
  });
}
