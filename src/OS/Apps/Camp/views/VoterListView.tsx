/**
 * VoterListView
 * List of delegates with voting power
 */

'use client';

import { useState } from 'react';
import { useVoters } from '../hooks';
import { VoterCard } from '../components';
import type { VoterSort } from '../types';
import styles from './VoterListView.module.css';

interface VoterListViewProps {
  onNavigate: (path: string) => void;
}

export function VoterListView({ onNavigate }: VoterListViewProps) {
  const [sort, setSort] = useState<VoterSort>('power');

  const { data: voters, isLoading, error } = useVoters(100, sort);

  if (error) {
    return (
      <div className={styles.error}>
        <p>Failed to load voters</p>
        <p className={styles.errorDetail}>{error.message}</p>
      </div>
    );
  }

  return (
    <div className={styles.container}>
      <div className={styles.controls}>
        <select
          className={styles.select}
          value={sort}
          onChange={(e) => setSort(e.target.value as VoterSort)}
        >
          <option value="power">Voting Power</option>
          <option value="votes">Votes Cast</option>
          <option value="represented">Delegators</option>
        </select>
      </div>

      <div className={styles.list}>
        {isLoading ? (
          <div className={styles.loading}>Loading voters...</div>
        ) : voters && voters.length > 0 ? (
          voters.map((voter, index) => (
            <VoterCard
              key={voter.id}
              voter={voter}
              rank={index + 1}
              onClick={() => onNavigate(`voter/${voter.id}`)}
            />
          ))
        ) : (
          <div className={styles.empty}>No voters found</div>
        )}
      </div>
    </div>
  );
}

