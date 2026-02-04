/**
 * ActivityView
 * Unified activity feed with Digest sidebar on desktop
 * Two-column layout: Activity feed (left) | Digest (right)
 */

'use client';

import { useState, useCallback } from 'react';
import { appLauncher } from '@/OS/lib/AppLauncher';
import { useActivityFeed } from '../hooks';
import { ActivityItem, CommandPalette, Digest } from '../components';
import styles from './ActivityView.module.css';

interface ActivityViewProps {
  onNavigate: (path: string) => void;
}

export function ActivityView({ onNavigate }: ActivityViewProps) {
  const { data: activities, isLoading, error } = useActivityFeed(50);
  const [isCommandPaletteOpen, setIsCommandPaletteOpen] = useState(false);

  /**
   * Open the Nouns Auction app with a specific noun
   * Uses appLauncher per ARCHITECTURE.md guidelines
   */
  const handleClickAuction = useCallback((nounId: string) => {
    appLauncher.launch('nouns-auction', {
      initialState: { nounId },
    });
  }, []);

  if (error) {
    return (
      <div className={styles.container}>
        <div className={styles.error}>
          <p>Failed to load activity</p>
          <p className={styles.errorDetail}>{error.message}</p>
        </div>
      </div>
    );
  }

  return (
    <>
      <div className={styles.twoColumn}>
        {/* Left column: Activity feed */}
        <div className={styles.activityColumn}>
          {/* Search bar - opens command palette */}
          <div className={styles.searchBar}>
            <button
              className={styles.searchButton}
              onClick={() => setIsCommandPaletteOpen(true)}
            >
              <span className={styles.searchPlaceholder}>Search...</span>
            </button>
          </div>
          
          {/* Activity list */}
          <div className={styles.activityList}>
            {isLoading ? (
              <div className={styles.loading}>Loading activity...</div>
            ) : !activities || activities.length === 0 ? (
              <div className={styles.empty}>
                <p>No activity found</p>
              </div>
            ) : (
              activities.map(item => (
                <ActivityItem
                  key={item.id}
                  item={item}
                  allItems={activities}
                  onClickProposal={(id) => onNavigate(`proposal/${id}`)}
                  onClickVoter={(address) => onNavigate(`voter/${address}`)}
                  onClickCandidate={(proposer, slug) => onNavigate(`candidate/${proposer}/${slug}`)}
                  onClickAuction={handleClickAuction}
                />
              ))
            )}
          </div>
        </div>
        
        {/* Right column: Digest (desktop only) */}
        <div className={styles.digestColumn}>
          <Digest onNavigate={onNavigate} />
        </div>
      </div>
      
      {/* Command Palette Modal */}
      <CommandPalette
        isOpen={isCommandPaletteOpen}
        onClose={() => setIsCommandPaletteOpen(false)}
        onNavigate={onNavigate}
      />
    </>
  );
}
