/**
 * Render an arbitrary V2 noun SVG from a seed (no token mint required).
 * Calls NounsDescriptorV2.genericDataURI(name, description, seed) — the
 * descriptor handles palette/RLE decode and SVG assembly fully on-chain.
 *
 * Used by the crystal-ball view to render the predicted next noun each block.
 * One RPC read per seed change; result is cached by wagmi.
 */

'use client';

import { useMemo } from 'react';
import { useReadContract } from 'wagmi';
import { V2_CONTRACTS, V2_CHAIN_ID } from '../contracts';
import type { V2Seed } from '../utils/slobber';
import styles from './V2NounImage.module.css';

interface DataURIPayload {
  name?: string;
  description?: string;
  image?: string;
}

interface Props {
  seed: V2Seed | null;
  size?: number;
  className?: string;
}

export function V2NounImageFromSeed({ seed, size = 280, className }: Props) {
  const args = useMemo(
    () =>
      seed
        ? ([
            'Noun',
            'Predicted next Noun V2',
            {
              background: seed.background,
              body: seed.body,
              accessory: seed.accessory,
              head: seed.head,
              glasses: seed.glasses,
            },
          ] as const)
        : undefined,
    [seed],
  );

  const { data, isLoading } = useReadContract({
    address: V2_CONTRACTS.descriptor.address,
    abi: V2_CONTRACTS.descriptor.abi,
    functionName: 'genericDataURI',
    args,
    chainId: V2_CHAIN_ID,
    query: {
      enabled: !!seed,
      staleTime: Infinity,
      gcTime: 5 * 60_000,
    },
  });

  const image = useMemo<string | null>(() => {
    if (!data || typeof data !== 'string') return null;
    try {
      const prefix = 'data:application/json;base64,';
      const raw = data.startsWith(prefix) ? data.slice(prefix.length) : data;
      const json =
        typeof atob === 'function' ? atob(raw) : Buffer.from(raw, 'base64').toString('utf8');
      const parsed = JSON.parse(json) as DataURIPayload;
      return parsed.image ?? null;
    } catch {
      return null;
    }
  }, [data]);

  return (
    <div
      className={`${styles.wrap} ${className ?? ''}`}
      style={{ width: size, height: size }}
    >
      {isLoading || !image ? (
        <div className={styles.placeholder}>…</div>
      ) : (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={image} alt="Predicted Noun V2" className={styles.image} />
      )}
    </div>
  );
}
