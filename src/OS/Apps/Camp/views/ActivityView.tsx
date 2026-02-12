/**
 * ActivityView
 * Unified activity feed with Digest sidebar on desktop
 * Desktop: Two-column layout — Activity feed (left) | Digest (right)
 * Mobile: Single column with tab bar — Activity | Digest | Proposals | Candidates | Voters
 */

'use client';

import { useState, useCallback } from 'react';
import { appLauncher } from '@/OS/lib/AppLauncher';
import { useIsMobile } from '@/OS/lib/PlatformDetection';
import { useActivityFeed } from '../hooks';
import { ActivityItem, Digest } from '../components';
import { BerryLoader } from '../components/BerryLoader';
import type { DigestTab } from '../types';
import styles from './ActivityView.module.css';

type MobileTab = 'activity' | DigestTab;

interface ActivityViewProps {
  onNavigate: (path: string) => void;
  digestTab?: DigestTab;
  onDigestTabChange?: (tab: DigestTab) => void;
}

const MOBILE_TABS: { id: MobileTab; label: string }[] = [
  { id: 'activity', label: 'Activity' },
  { id: 'digest', label: 'Digest' },
  { id: 'proposals', label: 'Proposals' },
  { id: 'candidates', label: 'Candidates' },
  { id: 'voters', label: 'Voters' },
];

export function ActivityView({ onNavigate, digestTab, onDigestTabChange }: ActivityViewProps) {
  const { data: activities, isLoading, error } = useActivityFeed(50);
  const isMobile = useIsMobile();
  
  // Mobile tab state — 'activity' shows the feed, anything else maps to a Digest tab
  const [mobileTab, setMobileTab] = useState<MobileTab>('activity');

  /**
   * Open the Nouns Auction app with a specific noun
   * Uses appLauncher per ARCHITECTURE.md guidelines
   */
  const handleClickAuction = useCallback((nounId: string) => {
    appLauncher.launch('nouns-auction', {
      initialState: { nounId },
    });
  }, []);

  const handleMobileTabChange = (tab: MobileTab) => {
    setMobileTab(tab);
    // Sync digest tab state with parent for persistence across navigation
    if (tab !== 'activity') {
      onDigestTabChange?.(tab as DigestTab);
    }
  };

  // Shared activity feed content
  const activityFeedContent = (
    <div className={styles.activityList}>
      {isLoading ? (
        <BerryLoader />
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
  );

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

  // Mobile: single column with unified tab bar
  if (isMobile) {
    const digestTabId = mobileTab === 'activity' ? 'digest' : (mobileTab as DigestTab);

    return (
      <div className={styles.mobileLayout}>
        {/* Tab bar */}
        <div className={styles.mobileTabs}>
          {MOBILE_TABS.map(tab => (
            <button
              key={tab.id}
              className={`${styles.mobileTab} ${mobileTab === tab.id ? styles.active : ''}`}
              onClick={() => handleMobileTabChange(tab.id)}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* Tab content */}
        <div className={styles.mobileContent}>
          {mobileTab === 'activity' ? (
            activityFeedContent
          ) : (
            <Digest
              onNavigate={onNavigate}
              activeTab={digestTabId}
              onTabChange={(tab) => handleMobileTabChange(tab)}
              hideTabs
            />
          )}
        </div>
      </div>
    );
  }

  // Desktop: two-column layout
  return (
    <div className={styles.twoColumn}>
      {/* Left column: Activity feed */}
      <div className={styles.activityColumn}>
        {activityFeedContent}
      </div>
      
      {/* Right column: Digest */}
      <div className={styles.digestColumn}>
        <Digest onNavigate={onNavigate} activeTab={digestTab} onTabChange={onDigestTabChange} />
      </div>
    </div>
  );
}
