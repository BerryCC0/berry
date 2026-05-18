/**
 * On-chain trait catalog (Refresh-from-chain).
 *
 * The bundled image-data is the fast path; this hook is what users hit when
 * they click "Refresh from chain" on a picker — it batches a `useReadContracts`
 * call against `NounsDescriptorV3` to pull every trait blob for a part and
 * caches results in react-query.
 *
 * Background traits are special: `Descriptor.backgrounds(i)` returns a hex
 * color string instead of a bytes blob, so we render a solid color thumbnail.
 */

'use client';

import { useMemo } from 'react';
import { useReadContract, useReadContracts } from 'wagmi';
import { NOUNS_ADDRESSES } from '@/app/lib/nouns/contracts';
import { NounsDescriptorV3ABI } from '@/app/lib/nouns/abis/NounsDescriptorV3';
import { ImageData as NounsImageData } from '@/app/lib/nouns/utils/image-data';
import { decodeRleTrait, normalizeBackgroundColor } from '../utils/decodeRleTrait';
import {
  pixelArrayToThumbnail,
  solidColorThumbnail,
} from '../utils/pixelArrayToThumbnail';
import type { NounPart } from '../types';

const CHAIN_ID = 1;
const DESCRIPTOR_ADDRESS = NOUNS_ADDRESSES.descriptor;

const COUNT_FN: Record<NounPart, 'backgroundCount' | 'bodyCount' | 'accessoryCount' | 'headCount' | 'glassesCount'> = {
  background: 'backgroundCount',
  body: 'bodyCount',
  accessory: 'accessoryCount',
  head: 'headCount',
  glasses: 'glassesCount',
};

const TRAIT_FN: Record<NounPart, 'backgrounds' | 'bodies' | 'accessories' | 'heads' | 'glasses'> = {
  background: 'backgrounds',
  body: 'bodies',
  accessory: 'accessories',
  head: 'heads',
  glasses: 'glasses',
};

export interface OnChainTraitMeta {
  index: number;
  /** PNG dataURL for picker thumbnails. */
  thumbnailDataUrl: string;
}

export interface UseOnChainTraitsResult {
  /** Total count of this part on-chain. `null` until the count call resolves. */
  count: number | null;
  /** Per-trait metadata. Empty until `enabled` and the batch resolves. */
  traits: OnChainTraitMeta[];
  isLoadingCount: boolean;
  isLoadingTraits: boolean;
  error: Error | null;
}

/**
 * Pull every trait of one part from the Descriptor.
 *
 * Pass `enabled: false` to skip the (expensive) batch read — pickers usually
 * start with `enabled: false` and flip to true when the user clicks "Refresh".
 */
export function useOnChainTraits(
  part: NounPart,
  options: { enabled?: boolean } = {},
): UseOnChainTraitsResult {
  const { enabled = false } = options;

  const countQuery = useReadContract({
    address: DESCRIPTOR_ADDRESS,
    abi: NounsDescriptorV3ABI,
    functionName: COUNT_FN[part],
    chainId: CHAIN_ID,
    query: {
      enabled,
      staleTime: 5 * 60 * 1000,
    },
  });

  const count = countQuery.data !== undefined ? Number(countQuery.data) : null;

  const traitContracts = useMemo(() => {
    if (!enabled || count === null) return [];
    const fn = TRAIT_FN[part];
    const out: {
      address: `0x${string}`;
      abi: typeof NounsDescriptorV3ABI;
      functionName: typeof fn;
      args: readonly [bigint];
      chainId: 1;
    }[] = [];
    for (let i = 0; i < count; i++) {
      out.push({
        address: DESCRIPTOR_ADDRESS,
        abi: NounsDescriptorV3ABI,
        functionName: fn,
        args: [BigInt(i)] as const,
        chainId: CHAIN_ID,
      });
    }
    return out;
  }, [enabled, count, part]);

  const traitsQuery = useReadContracts({
    contracts: traitContracts,
    allowFailure: true,
    query: {
      enabled: enabled && traitContracts.length > 0,
      staleTime: 30 * 60 * 1000,
    },
  });

  const traits = useMemo<OnChainTraitMeta[]>(() => {
    if (!traitsQuery.data) return [];
    const palette = NounsImageData.palette;
    const out: OnChainTraitMeta[] = [];
    for (let i = 0; i < traitsQuery.data.length; i++) {
      const entry = traitsQuery.data[i];
      if (entry.status !== 'success' || entry.result === undefined) continue;

      if (part === 'background') {
        const color = normalizeBackgroundColor(entry.result as string);
        out.push({
          index: i,
          thumbnailDataUrl: solidColorThumbnail(color, 2),
        });
      } else {
        try {
          const decoded = decodeRleTrait(entry.result as `0x${string}`);
          out.push({
            index: i,
            thumbnailDataUrl: pixelArrayToThumbnail(decoded.pixels, palette, 2),
          });
        } catch {
          // Skip malformed entries; pickers just won't show them.
        }
      }
    }
    return out;
  }, [traitsQuery.data, part]);

  return {
    count,
    traits,
    isLoadingCount: countQuery.isLoading,
    isLoadingTraits: traitsQuery.isLoading,
    error: (countQuery.error as Error | null) ?? (traitsQuery.error as Error | null) ?? null,
  };
}
