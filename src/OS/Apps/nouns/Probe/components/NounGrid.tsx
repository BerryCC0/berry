/**
 * NounGrid Component
 * Responsive grid of Noun thumbnails with pagination
 */

'use client';

import { useCallback, useRef, useEffect } from 'react';
import { NounImage } from '@/app/lib/nouns/components';
import type { NounListItem } from '@/app/lib/nouns/hooks/useNoun';
import styles from './NounGrid.module.css';

interface NounGridProps {
  nouns: NounListItem[];
  total: number;
  isLoading: boolean;
  isFetching: boolean;
  hasMore: boolean;
  auctionNounId?: number | null;
  onLoadMore: () => void;
  onSelectNoun: (id: number) => void;
}

export function NounGrid({
  nouns,
  total,
  isLoading,
  isFetching,
  hasMore,
  auctionNounId,
  onLoadMore,
  onSelectNoun,
}: NounGridProps) {
  const scrollRef = useRef<HTMLDivElement>(null);
  const sentinelRef = useRef<HTMLDivElement>(null);

  // Infinite scroll via IntersectionObserver
  useEffect(() => {
    const sentinel = sentinelRef.current;
    const scrollContainer = scrollRef.current;
    if (!sentinel || !scrollContainer || !hasMore || isFetching) return;

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting) {
          onLoadMore();
        }
      },
      {
        root: scrollContainer,
        rootMargin: '200px',
        threshold: 0,
      }
    );

    observer.observe(sentinel);
    return () => observer.disconnect();
  }, [hasMore, isFetching, onLoadMore]);

  if (isLoading && nouns.length === 0) {
    return (
      <div className={styles.loading}>
        <div className={styles.spinner} />
        <span>Loading Nouns...</span>
      </div>
    );
  }

  if (nouns.length === 0) {
    return (
      <div className={styles.empty}>
        <span className={styles.emptyIcon}>⌐◨-◨</span>
        <span>No Nouns match these filters</span>
      </div>
    );
  }

  return (
    <div className={styles.scrollContainer} ref={scrollRef}>
      <div className={styles.grid}>
        {nouns.map((noun) => {
          const isAuction = noun.id === auctionNounId;
          return (
            <button
              key={noun.id}
              className={`${styles.nounCard} ${isAuction ? styles.auctionCard : ''}`}
              onClick={() => onSelectNoun(noun.id)}
              title={isAuction ? `Noun ${noun.id} — Active Auction` : `Noun ${noun.id}`}
            >
              {isAuction && <span className={styles.bidBadge}>BID</span>}
              <NounImage
                seed={{
                  background: noun.background,
                  body: noun.body,
                  accessory: noun.accessory,
                  head: noun.head,
                  glasses: noun.glasses,
                }}
                size={64}
                className={styles.nounImage}
              />
              <span className={styles.nounId}>{noun.id}</span>
            </button>
          );
        })}
      </div>

      {/* Infinite scroll sentinel */}
      {hasMore && (
        <div ref={sentinelRef} className={styles.sentinel}>
          {isFetching && (
            <div className={styles.loadingMore}>
              <div className={styles.spinner} />
            </div>
          )}
        </div>
      )}
    </div>
  );
}
