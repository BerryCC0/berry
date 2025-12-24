'use client';

import type { Spot } from '../types';
import { getCategoryColor } from '../types';
import styles from './SpotDetail.module.css';

const NOUNSPOT_BASE = 'https://nounspot.com';

/**
 * Convert relative URLs to absolute nounspot.com URLs
 */
function getImageUrl(url: string | null): string | null {
  if (!url) return null;
  if (url.startsWith('http://') || url.startsWith('https://')) {
    return url;
  }
  return `${NOUNSPOT_BASE}${url}`;
}

interface SpotDetailProps {
  spot: Spot;
  onBack: () => void;
}

export function SpotDetail({ spot, onBack }: SpotDetailProps) {
  const categoryColor = getCategoryColor(spot.category);
  const createdDate = new Date(spot.createdAt).toLocaleDateString();

  const handleGetDirections = () => {
    const url = `https://www.google.com/maps/dir/?api=1&destination=${spot.locationLat},${spot.locationLng}`;
    window.open(url, '_blank');
  };

  const handleShare = async () => {
    const url = `https://nounspot.com/spot/${spot.id}`;
    try {
      await navigator.clipboard.writeText(url);
      // Could add a toast notification here
    } catch (err) {
      console.error('Failed to copy URL:', err);
    }
  };

  return (
    <div className={styles.container}>
      <button className={styles.backButton} onClick={onBack}>
        ← Back
      </button>

      <div 
        className={styles.header}
        style={{ backgroundColor: categoryColor }}
      >
        <span className={styles.category}>{spot.category}</span>
        <h1 className={styles.name}>{spot.name}</h1>
      </div>

      {spot.photoUrl && (
        <div className={styles.imageContainer}>
          <img 
            src={getImageUrl(spot.photoUrl) || ''} 
            alt={spot.name}
            className={styles.image}
          />
        </div>
      )}

      <div className={styles.content}>
        {spot.description && (
          <div className={styles.section}>
            <p className={styles.description}>{spot.description}</p>
          </div>
        )}

        <div className={styles.section}>
          <h3 className={styles.sectionTitle}>📍 Location</h3>
          <p className={styles.address}>{spot.address}</p>
          <p className={styles.coords}>
            {spot.locationLat.toFixed(4)}, {spot.locationLng.toFixed(4)}
          </p>
        </div>

        {spot.eventDate && (
          <div className={styles.section}>
            <h3 className={styles.sectionTitle}>📅 Event</h3>
            <p className={styles.eventInfo}>
              {spot.eventDate} {spot.eventTime && `at ${spot.eventTime}`}
            </p>
          </div>
        )}

        {spot.community && spot.community.length > 0 && (
          <div className={styles.section}>
            <h3 className={styles.sectionTitle}>🏘️ Communities</h3>
            <div className={styles.communities}>
              {spot.community.map((c, i) => (
                <span key={i} className={styles.communityTag}>{c}</span>
              ))}
            </div>
          </div>
        )}

        {(spot.ownerUsername || spot.ownerWalletAddress) && (
          <div className={styles.section}>
            <h3 className={styles.sectionTitle}>👤 Added by</h3>
            <p className={styles.owner}>
              {spot.ownerUsername || 
               (spot.ownerWalletAddress 
                 ? `${spot.ownerWalletAddress.slice(0, 6)}...${spot.ownerWalletAddress.slice(-4)}`
                 : 'Anonymous')}
            </p>
          </div>
        )}

        <div className={styles.section}>
          <h3 className={styles.sectionTitle}>📆 Added</h3>
          <p className={styles.date}>{createdDate}</p>
        </div>

        <div className={styles.actions}>
          <button 
            className={styles.primaryButton}
            onClick={handleGetDirections}
            style={{ backgroundColor: categoryColor }}
          >
            🧭 Get Directions
          </button>
          <button 
            className={styles.secondaryButton}
            onClick={handleShare}
          >
            📋 Share
          </button>
          {spot.contactLink && (
            <a 
              href={spot.contactLink}
              target="_blank"
              rel="noopener noreferrer"
              className={styles.secondaryButton}
            >
              🔗 More Info
            </a>
          )}
        </div>
      </div>
    </div>
  );
}

