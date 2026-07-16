/**
 * V2 Probe grid — thumbnails of every V2 noun. Art comes pre-batched via a
 * single multicall (see useV2NounImages) and is passed in as an id → image map,
 * so the grid renders plain <img> tags with a placeholder fallback.
 * The live-auction noun gets a BID badge; clicking a card opens the detail view.
 */

'use client';

import type { V2ProbeNoun } from '../hooks/useV2ProbeNouns';
import styles from './V2ProbeGrid.module.css';

interface Props {
  nouns: V2ProbeNoun[];
  images: Record<number, string>;
  isLoading: boolean;
  auctionNounId: number | null;
  onSelect: (id: number) => void;
}

export function V2ProbeGrid({ nouns, images, isLoading, auctionNounId, onSelect }: Props) {
  if (isLoading && nouns.length === 0) {
    return (
      <div className={styles.status}>
        <div className={styles.spinner} />
        <span>Loading Nouns…</span>
      </div>
    );
  }

  if (nouns.length === 0) {
    return (
      <div className={styles.status}>
        <span className={styles.emptyIcon}>⌐◨-◨</span>
        <span>No Nouns match these filters</span>
      </div>
    );
  }

  return (
    <div className={styles.scroll}>
      <div className={styles.grid}>
        {nouns.map((noun) => {
          const isAuction = noun.id === auctionNounId;
          const img = images[noun.id];
          return (
            <button
              key={noun.id}
              type="button"
              className={`${styles.card} ${isAuction ? styles.auctionCard : ''}`}
              onClick={() => onSelect(noun.id)}
              title={isAuction ? `Noun ${noun.id} — Active Auction` : `Noun ${noun.id}`}
            >
              {isAuction && <span className={styles.bidBadge}>BID</span>}
              {img ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={img} alt={`Noun ${noun.id}`} className={styles.image} />
              ) : (
                <div className={styles.imagePlaceholder}>#{noun.id}</div>
              )}
              <span className={styles.id}>{noun.id}</span>
            </button>
          );
        })}
      </div>
    </div>
  );
}
