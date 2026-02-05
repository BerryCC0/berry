/**
 * CandidateListView
 * List of proposal candidates
 */

'use client';

import { useCandidates } from '../hooks/useCandidates';
import { CandidateCard } from '../components/CandidateCard';
import styles from './CandidateListView.module.css';

interface CandidateListViewProps {
  onNavigate: (path: string) => void;
}

export function CandidateListView({ onNavigate }: CandidateListViewProps) {
  const { data: candidates, isLoading, error } = useCandidates(50);

  if (error) {
    return (
      <div className={styles.error}>
        <p>Failed to load candidates</p>
        <p className={styles.errorDetail}>{error.message}</p>
      </div>
    );
  }

  return (
    <div className={styles.container}>
      <div className={styles.list}>
        {isLoading ? (
          <div className={styles.loading}>Loading candidates...</div>
        ) : candidates && candidates.length > 0 ? (
          candidates.map(candidate => (
            <CandidateCard
              key={candidate.id}
              candidate={candidate}
              onClick={() => onNavigate(`c/${candidate.slug}`)}
            />
          ))
        ) : (
          <div className={styles.empty}>No candidates found</div>
        )}
      </div>
    </div>
  );
}

