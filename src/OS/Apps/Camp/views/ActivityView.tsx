/**
 * ActivityView
 * Unified activity feed with Digest sidebar on desktop
 * Two-column layout: Activity feed (left) | Digest (right)
 */

'use client';

import { useCallback } from 'react';
import { appLauncher } from '@/OS/lib/AppLauncher';
import { useActivityFeed } from '../hooks';
import { ActivityItem, Digest } from '../components';
import styles from './ActivityView.module.css';

type DigestTabId = 'digest' | 'proposals' | 'candidates' | 'voters';

interface ActivityViewProps {
  onNavigate: (path: string) => void;
  digestTab?: DigestTabId;
  onDigestTabChange?: (tab: DigestTabId) => void;
}

export function ActivityView({ onNavigate, digestTab, onDigestTabChange }: ActivityViewProps) {
  const { data: activities, isLoading, error } = useActivityFeed(50);

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
    <div className={styles.twoColumn}>
      {/* Left column: Activity feed */}
      <div className={styles.activityColumn}>
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
                  onClickCandidate={(proposer, slug) => onNavigate(`c/${slug}`)}
                  onClickAuction={handleClickAuction}
                />
              ))
            )}
          </div>
        </div>
        
        {/* Right column: Digest (desktop only) */}
      <div className={styles.digestColumn}>
        <Digest onNavigate={onNavigate} activeTab={digestTab} onTabChange={onDigestTabChange} />
      </div>
    </div>
  );
}
