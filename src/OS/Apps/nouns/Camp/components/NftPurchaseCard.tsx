/**
 * NftPurchaseCard
 * Compact preview of an NFT purchase action — image, name/ID, collection,
 * price, and a seller hover-link. Used in TransactionSummary on proposal
 * and candidate detail pages so an NFT buy reads as an actual NFT, not a
 * generic "Call to Seaport".
 *
 * Special-cases Nouns (renders NounImageById, no network call). Falls
 * back to fetching metadata via OpenSea for any other NFT contract.
 */

'use client';

import { useCallback } from 'react';
import { NounImageById } from '@/app/lib/nouns/components';
import { NOUNS_ADDRESSES } from '@/app/lib/nouns/contracts';
import { useNftMetadata } from '../hooks/useNftMetadata';
import { VoterLink } from './VoterLink';
import { AddressWithENS } from './SimulationStatus/SimulationStatus';
import styles from './NftPurchaseCard.module.css';

interface NftPurchaseCardProps {
  contract: string;
  tokenId: string;
  ethPriceStr: string; // human-readable, e.g. "2.22"
  seller?: string;
  /** Optional onNavigate so the seller link can route to their Camp profile. */
  onNavigate?: (path: string) => void;
}

export function NftPurchaseCard({
  contract,
  tokenId,
  ethPriceStr,
  seller,
  onNavigate,
}: NftPurchaseCardProps) {
  const isNoun =
    contract.toLowerCase() === NOUNS_ADDRESSES.token.toLowerCase();

  // For Nouns, render on-chain pixel art directly. For everything else,
  // fetch metadata via OpenSea (skipped if it's a Noun — useNftMetadata
  // is conditional via `enabled`, but we still avoid unused state).
  const { data: metadata } = useNftMetadata(
    isNoun ? undefined : contract,
    isNoun ? undefined : tokenId,
  );

  const displayName = isNoun
    ? `Noun ${tokenId}`
    : metadata?.name || `Token #${tokenId}`;
  const collection = isNoun ? 'NOUNS' : metadata?.collectionSlug || undefined;

  const onSellerClickStop = useCallback(
    (e: React.MouseEvent) => e.stopPropagation(),
    [],
  );

  return (
    <div className={styles.card}>
      <div className={styles.imageWrap}>
        {isNoun ? (
          <NounImageById
            id={parseInt(tokenId, 10)}
            size={56}
            className={styles.image}
          />
        ) : metadata?.imageUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={metadata.imageUrl}
            alt=""
            className={styles.image}
          />
        ) : (
          <div className={styles.imagePlaceholder} />
        )}
      </div>
      <div className={styles.body}>
        <div className={styles.name}>{displayName}</div>
        {collection && <div className={styles.collection}>{collection}</div>}
        <div className={styles.price}>
          <strong>{ethPriceStr} ETH</strong>
        </div>
        {seller && (
          <div className={styles.sellerLine} onClick={onSellerClickStop}>
            <span className={styles.sellerLabel}>Seller</span>{' '}
            <VoterLink
              address={seller}
              onNavigate={onNavigate}
              className={styles.sellerLink}
            >
              <AddressWithENS address={seller} className={styles.sellerAddr} />
            </VoterLink>
          </div>
        )}
      </div>
    </div>
  );
}
