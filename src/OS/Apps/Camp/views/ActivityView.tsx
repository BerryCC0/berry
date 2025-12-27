/**
 * ActivityView
 * Unified activity feed showing votes, signals, and governance events
 */

'use client';

import { useActivityFeed } from '../hooks';
import { ActivityItem } from '../components';
import styles from './ActivityView.module.css';

interface ActivityViewProps {
  onNavigate: (path: string) => void;
}

export function ActivityView({ onNavigate }: ActivityViewProps) {
  const { data: activities, isLoading, error } = useActivityFeed(50);

  if (error) {
    return (
      <div className={styles.error}>
        <p>Failed to load activity</p>
        <p className={styles.errorDetail}>{error.message}</p>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className={styles.loading}>
        Loading activity...
      </div>
    );
  }

  if (!activities || activities.length === 0) {
    return (
      <div className={styles.empty}>
        <p>No recent activity</p>
      </div>
    );
  }

  return (
    <div className={styles.container}>
      {activities.map(item => (
        <ActivityItem
          key={item.id}
          item={item}
          onClickProposal={(id) => onNavigate(`proposal/${id}`)}
          onClickVoter={(address) => onNavigate(`voter/${address}`)}
          onClickCandidate={(proposer, slug) => onNavigate(`candidate/${proposer}/${slug}`)}
        />
      ))}
    </div>
  );
}

