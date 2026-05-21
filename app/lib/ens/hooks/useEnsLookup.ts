/**
 * ENS read hooks for name metadata.
 *
 * - useEnsResolver: which resolver contract handles this name
 * - useEnsOwner: who controls this name in the Registry
 * - useEnsExpiry: when does this .eth name expire (only meaningful for 2LDs)
 * - useEnsAvailable: is this .eth name available to register
 */

import { useQuery } from '@tanstack/react-query';
import { getResolver, getOwner, getExpiry, getAvailable } from '@ensdomains/ensjs/public';
import { ensPublicClient } from '@/app/lib/ens/client';
import { isValidEnsName } from '@/app/lib/ens/utils/namehash';

const DEFAULT_STALE_TIME = 60_000;

export function useEnsResolver(name: string | undefined) {
  return useQuery({
    queryKey: ['ens', 'resolver', name],
    queryFn: () => getResolver(ensPublicClient(), { name: name! }),
    enabled: !!name && isValidEnsName(name),
    staleTime: DEFAULT_STALE_TIME,
  });
}

export function useEnsOwner(name: string | undefined) {
  return useQuery({
    queryKey: ['ens', 'owner', name],
    queryFn: () => getOwner(ensPublicClient(), { name: name! }),
    enabled: !!name && isValidEnsName(name),
    staleTime: DEFAULT_STALE_TIME,
  });
}

export function useEnsExpiry(name: string | undefined) {
  return useQuery({
    queryKey: ['ens', 'expiry', name],
    queryFn: () => getExpiry(ensPublicClient(), { name: name! }),
    enabled: !!name && isValidEnsName(name) && name.endsWith('.eth'),
    staleTime: DEFAULT_STALE_TIME,
  });
}

export function useEnsAvailable(name: string | undefined) {
  return useQuery({
    queryKey: ['ens', 'available', name],
    queryFn: () => getAvailable(ensPublicClient(), { name: name! }),
    enabled: !!name && isValidEnsName(name) && name.endsWith('.eth'),
    staleTime: 10_000,
  });
}
