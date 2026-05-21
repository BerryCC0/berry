/**
 * Pricing for .eth name registration and renewal.
 *
 * Returns { base, premium } as bigints (wei). base is the duration cost,
 * premium decays from $100M to $0 over 21 days after a name expires.
 */

import { useQuery } from '@tanstack/react-query';
import { getPrice } from '@ensdomains/ensjs/public';
import { ensPublicClient } from '@/app/lib/ens/client';

const ONE_YEAR_SECONDS = 365 * 24 * 60 * 60;

export function useEnsPrice(
  name: string | undefined,
  durationSeconds: number = ONE_YEAR_SECONDS,
) {
  return useQuery({
    queryKey: ['ens', 'price', name, durationSeconds],
    queryFn: () =>
      getPrice(ensPublicClient(), {
        nameOrNames: name!,
        duration: BigInt(durationSeconds),
      }),
    enabled: !!name && name.endsWith('.eth') && durationSeconds > 0,
    staleTime: 30_000,
  });
}
