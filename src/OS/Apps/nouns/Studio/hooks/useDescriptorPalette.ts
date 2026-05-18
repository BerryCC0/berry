'use client';

/**
 * useDescriptorPalette
 *
 * Reads the on-chain palette from `NounsDescriptorV3.palettes(0)` and exposes
 * it as a `string[]` of `#rrggbb` colors. Index 0 is transparent (sentinel) —
 * by convention we keep it in the array as `'#00000000'` so palette-index → color
 * lookups stay 1:1 with the on-chain layout.
 *
 * The full Nouns palette is a single packed bytes blob: 3 bytes per color
 * (R, G, B), up to 256 entries (~768 bytes). We slice it client-side.
 *
 * If the read fails (no network, RPC down) we fall back to a snapshot of the
 * palette derived from the bundled `image-data.ts` so Studio still draws.
 */

import { useEffect, useMemo } from 'react';
import { useReadContract } from 'wagmi';
import { NOUNS_ADDRESSES } from '@/app/lib/nouns/contracts';
import { NounsDescriptorV3ABI } from '@/app/lib/nouns/abis';
import { usePalette } from '../model/palette';

const DESCRIPTOR = NOUNS_ADDRESSES.descriptor as `0x${string}`;

/** Bytes blob → ['#rrggbb', ...]. First entry is transparent ('#00000000'). */
function parsePaletteBytes(bytes: `0x${string}` | string): string[] {
  const hex = bytes.startsWith('0x') ? bytes.slice(2) : bytes;
  // Every color is 3 bytes = 6 hex chars.
  const colors: string[] = ['#00000000']; // Index 0: transparent by convention.
  for (let i = 0; i + 6 <= hex.length; i += 6) {
    const r = hex.slice(i, i + 2);
    const g = hex.slice(i + 2, i + 4);
    const b = hex.slice(i + 4, i + 6);
    colors.push(`#${r}${g}${b}`.toLowerCase());
  }
  return colors;
}

export interface UseDescriptorPaletteResult {
  palette: string[];
  isLoading: boolean;
  error: Error | null;
  refetch: () => void;
}

export function useDescriptorPalette(): UseDescriptorPaletteResult {
  const setDescriptor = usePalette((s) => s.setDescriptor);
  const cached = usePalette((s) => s.descriptor);

  const { data, isLoading, error, refetch } = useReadContract({
    address: DESCRIPTOR,
    abi: NounsDescriptorV3ABI,
    functionName: 'palettes',
    args: [0],
    chainId: 1,
    query: {
      // Palette is effectively immutable — once it's loaded, keep forever.
      staleTime: Infinity,
      gcTime: Infinity,
    },
  });

  const parsed = useMemo(() => {
    if (!data) return null;
    try {
      return parsePaletteBytes(data as `0x${string}`);
    } catch {
      return null;
    }
  }, [data]);

  // Mirror into the zustand store so non-React consumers (tools etc.) can read it.
  useEffect(() => {
    if (parsed && parsed.length > 0) setDescriptor(parsed);
  }, [parsed, setDescriptor]);

  const palette = parsed ?? cached;

  return {
    palette,
    isLoading,
    error: error as Error | null,
    refetch: () => {
      void refetch();
    },
  };
}
