/**
 * Renders a NounV2 token's on-chain SVG via dataURI(tokenId).
 * dataURI returns base64-encoded JSON with embedded SVG.
 */

'use client';

import { useMemo } from 'react';
import { useReadContract } from 'wagmi';
import { V2_CONTRACTS, V2_CHAIN_ID } from '../contracts';
import styles from './V2NounImage.module.css';

interface DataURIPayload {
  name?: string;
  description?: string;
  image?: string;
}

interface Props {
  tokenId: bigint | null | undefined;
  size?: number;
  className?: string;
}

export function V2NounImage({ tokenId, size = 280, className }: Props) {
  const { data, isLoading } = useReadContract({
    address: V2_CONTRACTS.token.address,
    abi: V2_CONTRACTS.token.abi,
    functionName: 'dataURI',
    args: tokenId != null ? [tokenId] : undefined,
    chainId: V2_CHAIN_ID,
    query: {
      enabled: tokenId != null,
      staleTime: Infinity,
      gcTime: Infinity,
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
        <div className={styles.placeholder}>
          {tokenId != null ? `#${tokenId.toString()}` : '—'}
        </div>
      ) : (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={image} alt={`Noun V2 ${tokenId?.toString() ?? ''}`} className={styles.image} />
      )}
    </div>
  );
}
