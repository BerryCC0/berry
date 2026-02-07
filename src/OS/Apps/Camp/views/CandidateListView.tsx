/**
 * CandidateListView
 * List of proposal candidates
 */

'use client';

import { useCandidates } from '../hooks/useCandidates';
import { CandidateCard } from '../components/CandidateCard';
import { BerryLoader } from '../components/BerryLoader';
import styles from './CandidateListView.module.css';

interface CandidateListViewProps {
  onNavigate: (path: string) => void;
  onBack: () => void;
}

export function CandidateListView({ onNavigate, onBack }: CandidateListViewProps) {
  const { data: candidates, isLoading, error } = useCandidates(50);

  if (error) {
    return (
      <div className={styles.error}>
        <button className={styles.backButton} onClick={onBack}>← Back</button>
        <p>Failed to load candidates</p>
        <p className={styles.errorDetail}>{error.message}</p>
      </div>
    );
  }

  return (
    <div className={styles.container}>
      <div className={styles.navBar}>
        <button className={styles.backButton} onClick={onBack}>← Back</button>
      </div>
      <div className={styles.list}>
        {isLoading ? (
          <BerryLoader />
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

