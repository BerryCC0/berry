/**
 * Set ENS resolver records: text, address (multi-coin), and content hash.
 *
 * Each hook looks up the name's resolver and encodes the call via ensjs's
 * makeFunctionData, then dispatches through useEnsWrite (wagmi).
 *
 * For batch updates use useSetEnsRecords — it sends a single multicall.
 */

import { useCallback } from 'react';
import {
  setTextRecord,
  setAddressRecord,
  setContentHashRecord,
  setRecords,
  clearRecords,
} from '@ensdomains/ensjs/wallet';
import { getResolver } from '@ensdomains/ensjs/public';
import type { Address } from 'viem';
import { ensEncoderClient } from '@/app/lib/ens/client';
import { useEnsWrite } from './useEnsWrite';

async function resolverFor(name: string): Promise<Address> {
  const resolver = await getResolver(ensEncoderClient(), { name });
  if (!resolver) throw new Error(`No resolver set for ${name}`);
  return resolver;
}

export function useSetTextRecord() {
  const w = useEnsWrite();
  const setText = useCallback(
    async (params: { name: string; key: string; value: string | null }) => {
      const resolverAddress = await resolverFor(params.name);
      const tx = setTextRecord.makeFunctionData(ensEncoderClient() as never, {
        ...params,
        resolverAddress,
      });
      return w.execute(tx);
    },
    [w],
  );
  return { ...w, setText };
}

export function useSetAddressRecord() {
  const w = useEnsWrite();
  const setAddress = useCallback(
    async (params: { name: string; coin?: string | number; value: string | null }) => {
      const resolverAddress = await resolverFor(params.name);
      const tx = setAddressRecord.makeFunctionData(ensEncoderClient() as never, {
        name: params.name,
        coin: params.coin ?? 60,
        value: params.value,
        resolverAddress,
      });
      return w.execute(tx);
    },
    [w],
  );
  return { ...w, setAddress };
}

export function useSetContentHash() {
  const w = useEnsWrite();
  const setContentHash = useCallback(
    async (params: { name: string; contentHash: string | null }) => {
      const resolverAddress = await resolverFor(params.name);
      const tx = setContentHashRecord.makeFunctionData(ensEncoderClient() as never, {
        ...params,
        resolverAddress,
      });
      return w.execute(tx);
    },
    [w],
  );
  return { ...w, setContentHash };
}

/**
 * Batch set multiple records in a single multicall transaction.
 * Far cheaper than sequential setText/setAddress calls.
 */
export function useSetEnsRecords() {
  const w = useEnsWrite();
  const setMany = useCallback(
    async (params: {
      name: string;
      texts?: { key: string; value: string }[];
      coins?: { coin: string | number; value: string }[];
      contentHash?: string;
      abi?: { contentType: 1 | 2 | 4 | 8; encodedData: `0x${string}` };
      clearRecords?: boolean;
    }) => {
      const resolverAddress = await resolverFor(params.name);
      const tx = setRecords.makeFunctionData(ensEncoderClient() as never, {
        name: params.name,
        resolverAddress,
        texts: params.texts,
        coins: params.coins,
        contentHash: params.contentHash,
        abi: params.abi,
        clearRecords: params.clearRecords,
      });
      return w.execute(tx);
    },
    [w],
  );
  return { ...w, setMany };
}

export function useClearEnsRecords() {
  const w = useEnsWrite();
  const clear = useCallback(
    async (name: string) => {
      const resolverAddress = await resolverFor(name);
      const tx = clearRecords.makeFunctionData(ensEncoderClient() as never, {
        name,
        resolverAddress,
      });
      return w.execute(tx);
    },
    [w],
  );
  return { ...w, clear };
}
