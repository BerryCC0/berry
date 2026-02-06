/**
 * NounDetail Component
 * Full-page Noun detail view inspired by probe.wtf
 * Background fills with the Noun's bg color, large image on right, info on left
 */

'use client';

import { useMemo } from 'react';
import { NounImage } from '@/app/lib/nouns/components';
import { getTraitName } from '@/app/lib/nouns/utils/trait-name-utils';
import { ImageData } from '@/app/lib/nouns/utils/image-data';
import type { TraitType } from '@/app/lib/nouns/utils/trait-name-utils';
import { useNounDetail, useNounOwner } from '../hooks/useNounDetail';
import styles from './NounDetail.module.css';

interface NounDetailProps {
  nounId: number;
  onBack: () => void;
  onNavigate: (id: number) => void;
  onFilterByTrait: (type: TraitType, value: number) => void;
}

function truncateAddress(address: string): string {
  if (!address) return '';
  return `${address.slice(0, 6)}…${address.slice(-4)}`;
}

function formatBid(weiStr: string | null): string {
  if (!weiStr || weiStr === '0') return '';
  const eth = Number(BigInt(weiStr)) / 1e18;
  return `Ξ ${eth.toFixed(2)}`;
}

function formatDateTime(dateStr: string): string {
  try {
    const date = new Date(dateStr);
    const datePart = date.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });
    const timePart = date.toLocaleTimeString('en-US', {
      hour: 'numeric',
      minute: '2-digit',
      hour12: true,
    });
    return `on ${datePart} at ${timePart}`;
  } catch {
    return '';
  }
}

/**
 * Extract prominent colors from a Noun's traits for the color palette display
 */
function getNounColors(noun: { background: number; body: number; head: number; glasses: number; accessory: number }): string[] {
  const colors: string[] = [];
  
  // Background color
  const bgHex = ImageData.bgcolors[noun.background];
  if (bgHex) colors.push(`#${bgHex}`);
  
  // Extract palette indices used by each trait part
  const parts = [
    ImageData.images.bodies[noun.body],
    ImageData.images.heads[noun.head],
    ImageData.images.glasses[noun.glasses],
    ImageData.images.accessories[noun.accessory],
  ].filter(Boolean);

  // Collect unique non-transparent colors from the first few rects of each part
  const seen = new Set<string>();
  if (bgHex) seen.add(bgHex);

  for (const part of parts) {
    const data = part.data.replace(/^0x/, '');
    const rects = data.substring(10);
    const pairs = rects.match(/.{1,4}/g) || [];
    for (const pair of pairs) {
      const colorIndex = parseInt(pair.substring(2, 4), 16);
      if (colorIndex === 0) continue; // transparent
      const hex = ImageData.palette[colorIndex];
      if (hex && !seen.has(hex)) {
        seen.add(hex);
        colors.push(`#${hex}`);
        if (colors.length >= 6) return colors;
      }
    }
  }

  return colors;
}

export function NounDetail({ nounId, onBack, onNavigate, onFilterByTrait }: NounDetailProps) {
  const { data: noun, isLoading, error } = useNounDetail(nounId);
  const { data: owner } = useNounOwner(nounId);

  const traits = useMemo(() => {
    if (!noun) return null;
    return [
      { type: 'head' as TraitType, value: noun.head, name: getTraitName('head', noun.head) },
      { type: 'glasses' as TraitType, value: noun.glasses, name: getTraitName('glasses', noun.glasses) },
      { type: 'accessory' as TraitType, value: noun.accessory, name: getTraitName('accessory', noun.accessory) },
      { type: 'body' as TraitType, value: noun.body, name: getTraitName('body', noun.body) },
      { type: 'background' as TraitType, value: noun.background, name: getTraitName('background', noun.background) },
    ];
  }, [noun]);

  const bgColor = useMemo(() => {
    if (!noun) return undefined;
    const hex = ImageData.bgcolors[noun.background];
    return hex ? `#${hex}` : undefined;
  }, [noun]);

  const colors = useMemo(() => {
    if (!noun) return [];
    return getNounColors(noun);
  }, [noun]);

  // Loading / error states
  if (isLoading || error || !noun) {
    return (
      <div className={styles.container}>
        <div className={styles.topBar}>
          <div className={styles.breadcrumb}>
            <span className={styles.breadcrumbLink}>NOUNS</span>
            <span className={styles.breadcrumbSep}>/</span>
            <span className={styles.breadcrumbCurrent}>{nounId}</span>
          </div>
          <button className={styles.exploreButton} onClick={onBack}>EXPLORE</button>
        </div>
        <div className={styles.loading}>
          {isLoading ? (
            <>
              <div className={styles.spinner} />
              <span>Loading Noun {nounId}...</span>
            </>
          ) : (
            <span>Noun {nounId} not found</span>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className={styles.container} style={bgColor ? { background: bgColor } as React.CSSProperties : undefined}>
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

          {/* Auction / settlement info */}
          <div className={styles.infoBlock}>
            {noun.settled_by_address && (
              <div className={styles.infoRow}>
                <span className={styles.infoLabel}>SETTLED BY: </span>
                <span className={styles.infoLink}>
                  {noun.settled_by_ens || truncateAddress(noun.settled_by_address)}
                </span>
                {noun.settled_at && (
                  <span className={styles.infoSecondary}>
                    {' '}{formatDateTime(noun.settled_at)}
                  </span>
                )}
              </div>
            )}
            {noun.winning_bid && (
              <div className={styles.infoRow}>
                <span className={styles.infoLabel}>WINNING BID: </span>
                <span className={styles.infoValue}>{formatBid(noun.winning_bid)}</span>
                {noun.winner_address && (
                  <>
                    <span className={styles.infoSecondary}> BY </span>
                    <span className={styles.infoLink}>
                      {noun.winner_ens || truncateAddress(noun.winner_address)}
                    </span>
                  </>
                )}
              </div>
            )}
            {owner && (
              <div className={styles.infoRow}>
                <span className={styles.infoLabel}>CURRENT OWNER: </span>
                <span className={styles.infoLink}>{truncateAddress(owner)}</span>
              </div>
            )}
          </div>

          {/* Color palette */}
          {colors.length > 0 && (
            <div className={styles.colorsSection}>
              <div className={styles.colorsTitle}>COLORS</div>
              <div className={styles.colorSwatches}>
                {colors.map((color, i) => (
                  <div
                    key={i}
                    className={styles.swatch}
                    style={{ background: color }}
                    title={color}
                  />
                ))}
              </div>
            </div>
          )}

          {/* Traits */}
          {traits && (
            <div className={styles.traitsSection}>
              <div className={styles.traitsTitle}>ABOUT</div>
              {traits.map((trait) => (
                <div key={trait.type} className={styles.traitRow}>
                  <span className={styles.traitLabel}>{trait.type.toUpperCase()}:</span>
                  <button
                    className={styles.traitLink}
                    onClick={() => onFilterByTrait(trait.type, trait.value)}
                    title={`Filter by ${trait.type}: ${trait.name}`}
                  >
                    {trait.name.toUpperCase()}
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Right: Large Noun image */}
        <div className={styles.imageSection}>
          {noun.svg ? (
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
              size={480}
              className={styles.nounImage}
            />
          )}
        </div>
      </div>
    </div>
  );
}
