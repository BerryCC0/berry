/**
 * Renders a Food Noun's on-chain SVG via dataURI(tokenId).
 */

'use client';

import { useFNNounImage } from '../hooks/useFNNoun';
import styles from './FNNounImage.module.css';

interface Props {
  tokenId: bigint | null | undefined;
  size?: number;
  className?: string;
}

export function FNNounImage({ tokenId, size = 280, className }: Props) {
  const { image, isLoading } = useFNNounImage(tokenId);

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
        <img src={image} alt={`Food Noun ${tokenId?.toString() ?? ''}`} className={styles.image} />
      )}
    </div>
  );
}
