'use client';

import { getCategoryColor, type Spot } from '../types';
import styles from './SpotCard.module.css';

const NOUNSPOT_BASE = 'https://nounspot.com';

/**
 * Convert relative URLs to absolute nounspot.com URLs
 */
function getImageUrl(url: string | null): string | null {
  if (!url) return null;
  if (url.startsWith('http://') || url.startsWith('https://')) {
    return url;
  }
  // Relative URL - prepend nounspot.com
  return `${NOUNSPOT_BASE}${url}`;
}

interface SpotCardProps {
  spot: Spot;
  isSelected: boolean;
  onClick: () => void;
}

export function SpotCard({ spot, isSelected, onClick }: SpotCardProps) {
  const categoryColor = getCategoryColor(spot.category);
  const truncatedDescription = spot.description 
    ? spot.description.length > 120 
      ? `${spot.description.slice(0, 120)}...` 
      : spot.description
    : null;

  // Format address to be shorter
  const shortAddress = spot.address.length > 50 
    ? `${spot.address.slice(0, 50)}...` 
    : spot.address;

  return (
    <div 
      className={`${styles.card} ${isSelected ? styles.selected : ''}`}
      onClick={onClick}
      style={{ '--category-color': categoryColor } as React.CSSProperties}
    >
      <div className={styles.header} style={{ backgroundColor: categoryColor }}>
        <span className={styles.name}>{spot.name}</span>
        <span className={styles.categoryBadge}>{spot.category}</span>
      </div>

      {spot.photoUrl && (
        <div className={styles.imageContainer}>
          <img 
            src={getImageUrl(spot.photoUrl) || ''} 
            alt={spot.name}
            className={styles.image}
            loading="lazy"
            onError={(e) => {
              // Hide broken images
              (e.target as HTMLImageElement).style.display = 'none';
            }}
          />
        </div>
      )}

      <div className={styles.content}>
        {truncatedDescription && (
          <p className={styles.description}>{truncatedDescription}</p>
        )}
        
        <div className={styles.location}>
          <span className={styles.pin}>📍</span>
          <span className={styles.address}>{shortAddress}</span>
        </div>

        {spot.community && spot.community.length > 0 && (
          <div className={styles.communities}>
            {spot.community.map((c, i) => (
              <span key={i} className={styles.communityTag}>{c}</span>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

