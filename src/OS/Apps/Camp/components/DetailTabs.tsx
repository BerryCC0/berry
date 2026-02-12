/**
 * DetailTabs
 * Mobile tab navigation for proposal/candidate detail views
 * Only visible on mobile (<768px), hidden on desktop where the two-column layout is used
 */

'use client';

import { useState } from 'react';
import styles from './DetailTabs.module.css';

export interface DetailTab {
  id: string;
  label: string;
  count?: number;
}

interface DetailTabsProps {
  tabs: DetailTab[];
  activeTab?: string;
  onTabChange?: (tabId: string) => void;
  children: (activeTabId: string) => React.ReactNode;
}

/**
 * Hook for managing detail tab state
 */
export function useDetailTabs(defaultTab: string) {
  const [activeTab, setActiveTab] = useState(defaultTab);
  return { activeTab, setActiveTab };
}

export function DetailTabs({ tabs, activeTab: controlledTab, onTabChange, children }: DetailTabsProps) {
  const [internalTab, setInternalTab] = useState(tabs[0]?.id || '');
  
  const activeTab = controlledTab ?? internalTab;
  const setActiveTab = onTabChange ?? setInternalTab;
  
  return (
    <div className={styles.container}>
      <div className={styles.tabBar}>
        {tabs.map((tab) => (
          <button
            key={tab.id}
            className={`${styles.tab} ${activeTab === tab.id ? styles.active : ''}`}
            onClick={() => setActiveTab(tab.id)}
          >
            {tab.label}
            {tab.count !== undefined && tab.count > 0 && (
              <span className={styles.tabCount}>{tab.count}</span>
            )}
          </button>
        ))}
      </div>
      <div className={styles.tabContent}>
        {children(activeTab)}
      </div>
    </div>
  );
}
