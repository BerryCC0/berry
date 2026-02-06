/**
 * NounDetail Component
 * Shows a single Noun with large image, traits, auction info, and navigation
 */

'use client';

import { useMemo } from 'react';
import { NounImage } from '@/app/lib/nouns/components';
import { getTraitName } from '@/app/lib/nouns/utils/trait-name-utils';
import type { TraitType } from '@/app/lib/nouns/utils/trait-name-utils';
import { useNounDetail, useNounOwner } from '../hooks/useNounDetail';
import styles from './NounDetail.module.css';

interface NounDetailProps {
  nounId: number;
  onBack: () => void;
  onNavigate: (id: number) => void;
  onFilterByTrait: (type: TraitType, value: number) => void;
}

/**
 * Truncate an Ethereum address for display
 */
function truncateAddress(address: string): string {
  if (!address) return '';
  return `${address.slice(0, 6)}...${address.slice(-4)}`;
}

/**
 * Format wei to ETH string
 */
function formatBid(weiStr: string | null): string {
  if (!weiStr || weiStr === '0') return 'N/A';
  const eth = Number(BigInt(weiStr)) / 1e18;
  return `Ξ ${eth.toFixed(2)}`;
}

/**
 * Format a date string
 */
function formatDate(dateStr: string): string {
  try {
    const date = new Date(dateStr);
    return date.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });
  } catch {
    return dateStr;
  }
}

export function NounDetail({ nounId, onBack, onNavigate, onFilterByTrait }: NounDetailProps) {
  const { data: noun, isLoading, error } = useNounDetail(nounId);
  const { data: owner } = useNounOwner(nounId);

  const traits = useMemo(() => {
    if (!noun) return null;
    return {
      head: { value: noun.head, name: getTraitName('head', noun.head) },
      glasses: { value: noun.glasses, name: getTraitName('glasses', noun.glasses) },
      accessory: { value: noun.accessory, name: getTraitName('accessory', noun.accessory) },
      body: { value: noun.body, name: getTraitName('body', noun.body) },
      background: { value: noun.background, name: getTraitName('background', noun.background) },
    };
  }, [noun]);

  if (isLoading) {
    return (
      <div className={styles.container}>
        <div className={styles.topBar}>
          <button className={styles.backButton} onClick={onBack}>
            EXPLORE
          </button>
        </div>
        <div className={styles.loading}>
          <div className={styles.spinner} />
          <span>Loading Noun {nounId}...</span>
        </div>
      </div>
    );
  }

  if (error || !noun) {
    return (
      <div className={styles.container}>
        <div className={styles.topBar}>
          <button className={styles.backButton} onClick={onBack}>
            EXPLORE
          </button>
        </div>
        <div className={styles.loading}>
          <span>Noun {nounId} not found</span>
        </div>
      </div>
    );
  }

  return (
    <div className={styles.container}>
      {/* Top navigation bar */}
      <div className={styles.topBar}>
        <div className={styles.breadcrumb}>
          <span className={styles.breadcrumbLink}>NOUNS</span>
          <span className={styles.breadcrumbSep}>/</span>
          <span className={styles.breadcrumbCurrent}>{nounId}</span>
        </div>
        <div className={styles.navButtons}>
          <button
            className={styles.navButton}
            onClick={() => onNavigate(nounId - 1)}
            disabled={nounId <= 0}
            title="Previous Noun"
          >
            ←
          </button>
          <button
            className={styles.navButton}
            onClick={() => onNavigate(nounId + 1)}
            title="Next Noun"
          >
            →
          </button>
          <button className={styles.exploreButton} onClick={onBack}>
            EXPLORE
          </button>
        </div>
      </div>

      {/* Main content */}
      <div className={styles.content}>
        {/* Left: Info */}
        <div className={styles.infoSection}>
          <h1 className={styles.title}>NOUN {nounId}</h1>

          {/* Auction info */}
          <div className={styles.infoBlock}>
            {noun.settled_by_address && (
              <div className={styles.infoRow}>
                <span className={styles.infoLabel}>SETTLED BY:</span>
                <span className={styles.infoValue}>
                  {noun.settled_by_ens || truncateAddress(noun.settled_by_address)}
                </span>
                {noun.settled_at && (
                  <span className={styles.infoDate}>
                    {' '}on {formatDate(noun.settled_at)}
                  </span>
                )}
              </div>
            )}
            {noun.winning_bid && (
              <div className={styles.infoRow}>
                <span className={styles.infoLabel}>WINNING BID:</span>
                <span className={styles.infoValue}>
                  {formatBid(noun.winning_bid)}
                  {noun.winner_address && (
                    <> by {noun.winner_ens || truncateAddress(noun.winner_address)}</>
                  )}
                </span>
              </div>
            )}
            {owner && (
              <div className={styles.infoRow}>
                <span className={styles.infoLabel}>CURRENT OWNER:</span>
                <span className={styles.infoValue}>
                  {truncateAddress(owner)}
                </span>
              </div>
            )}
          </div>

          {/* Traits */}
          {traits && (
            <div className={styles.traitsSection}>
              <div className={styles.traitsTitle}>ABOUT</div>
              {(Object.entries(traits) as [TraitType, { value: number; name: string }][]).map(
                ([type, trait]) => (
                  <div key={type} className={styles.traitRow}>
                    <span className={styles.traitLabel}>{type.toUpperCase()}:</span>
                    <button
                      className={styles.traitLink}
                      onClick={() => onFilterByTrait(type, trait.value)}
                      title={`Filter by ${type}: ${trait.name}`}
                    >
                      {trait.name.toUpperCase()}
                    </button>
                  </div>
                )
              )}
            </div>
          )}
        </div>

        {/* Right: Image */}
        <div className={styles.imageSection}>
          {noun.svg ? (
            // Use cached SVG directly
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={`data:image/svg+xml,${encodeURIComponent(noun.svg)}`}
              alt={`Noun ${nounId}`}
              className={styles.nounImage}
            />
          ) : (
            <NounImage
              seed={{
                background: noun.background,
                body: noun.body,
                accessory: noun.accessory,
                head: noun.head,
                glasses: noun.glasses,
              }}
              size={400}
              className={styles.nounImage}
            />
          )}
        </div>
      </div>
    </div>
  );
}
