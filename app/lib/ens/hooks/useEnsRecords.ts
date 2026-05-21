/**
 * ENS record read hooks.
 *
 * - useEnsRecords: batched read of all common records for a name
 *   (addr, contenthash, multiple text keys) via Universal Resolver multicall
 * - useEnsTextRecord: single text record (avatar, url, com.twitter, etc.)
 * - useEnsAddressRecord: addr() for a name, with optional coinType for multi-chain
 */

import { useQuery } from '@tanstack/react-query';
import {
  getRecords,
  getTextRecord,
  getAddressRecord,
  getContentHashRecord,
} from '@ensdomains/ensjs/public';
import { ensPublicClient } from '@/app/lib/ens/client';
import { isValidEnsName } from '@/app/lib/ens/utils/namehash';
import { ENS_TEXT_KEYS, ENS_COIN_TYPES } from '@/app/lib/ens/utils/records';

const DEFAULT_STALE_TIME = 60_000;

/** Common text keys we fetch by default — extend by passing your own list. */
export const DEFAULT_TEXT_KEYS = [
  ENS_TEXT_KEYS.avatar,
  ENS_TEXT_KEYS.description,
  ENS_TEXT_KEYS.url,
  ENS_TEXT_KEYS.email,
  ENS_TEXT_KEYS.twitter,
  ENS_TEXT_KEYS.github,
  ENS_TEXT_KEYS.farcaster,
] as const;

/** Common coin types we fetch by default for multi-chain addresses. */
export const DEFAULT_COIN_TYPES = [
  ENS_COIN_TYPES.eth,
  ENS_COIN_TYPES.btc,
  ENS_COIN_TYPES.base,
] as const;

interface UseEnsRecordsOptions {
  texts?: readonly string[];
  coins?: readonly number[];
  contentHash?: boolean;
}

export function useEnsRecords(name: string | undefined, options: UseEnsRecordsOptions = {}) {
  const texts = options.texts ?? DEFAULT_TEXT_KEYS;
  const coins = options.coins ?? DEFAULT_COIN_TYPES;
  const contentHash = options.contentHash ?? true;

  return useQuery({
    queryKey: ['ens', 'records', name, texts, coins, contentHash],
    queryFn: () =>
      getRecords(ensPublicClient(), {
        name: name!,
        texts: [...texts],
        coins: [...coins],
        contentHash,
      }),
    enabled: !!name && isValidEnsName(name),
    staleTime: DEFAULT_STALE_TIME,
  });
}

export function useEnsTextRecord(name: string | undefined, key: string) {
  return useQuery({
    queryKey: ['ens', 'text', name, key],
    queryFn: () => getTextRecord(ensPublicClient(), { name: name!, key }),
    enabled: !!name && !!key && isValidEnsName(name),
    staleTime: DEFAULT_STALE_TIME,
  });
}

export function useEnsAddressRecord(name: string | undefined, coin?: string | number) {
  return useQuery({
    queryKey: ['ens', 'addr', name, coin],
    queryFn: () => getAddressRecord(ensPublicClient(), { name: name!, coin }),
    enabled: !!name && isValidEnsName(name),
    staleTime: DEFAULT_STALE_TIME,
  });
}

export function useEnsContentHash(name: string | undefined) {
  return useQuery({
    queryKey: ['ens', 'contenthash', name],
    queryFn: () => getContentHashRecord(ensPublicClient(), { name: name! }),
    enabled: !!name && isValidEnsName(name),
    staleTime: DEFAULT_STALE_TIME,
  });
}
