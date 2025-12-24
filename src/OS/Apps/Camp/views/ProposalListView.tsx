/**
 * ProposalListView
 * List of all proposals with filtering
 */

'use client';

import { useState } from 'react';
import { useProposals } from '../hooks';
import { ProposalCard } from '../components';
import type { ProposalFilter, ProposalSort } from '../types';
import styles from './ProposalListView.module.css';

interface ProposalListViewProps {
  onNavigate: (path: string) => void;
}

export function ProposalListView({ onNavigate }: ProposalListViewProps) {
  const [filter, setFilter] = useState<ProposalFilter>('all');
  const [sort, setSort] = useState<ProposalSort>('newest');

  const { data: proposals, isLoading, error } = useProposals(50, filter, sort);

  if (error) {
    return (
      <div className={styles.error}>
        <p>Failed to load proposals</p>
        <p className={styles.errorDetail}>{error.message}</p>
      </div>
    );
  }

  return (
    <div className={styles.container}>
      <div className={styles.controls}>
        <select
          className={styles.select}
          value={filter}
          onChange={(e) => setFilter(e.target.value as ProposalFilter)}
        >
          <option value="all">All</option>
          <option value="active">Active</option>
          <option value="pending">Pending</option>
          <option value="succeeded">Succeeded</option>
          <option value="defeated">Defeated</option>
          <option value="executed">Executed</option>
        </select>

        <select
          className={styles.select}
          value={sort}
          onChange={(e) => setSort(e.target.value as ProposalSort)}
        >
          <option value="newest">Newest</option>
          <option value="oldest">Oldest</option>
          <option value="ending_soon">Ending Soon</option>
        </select>
      </div>

      <div className={styles.list}>
        {isLoading ? (
          <div className={styles.loading}>Loading proposals...</div>
        ) : proposals && proposals.length > 0 ? (
          proposals.map(proposal => (
            <ProposalCard
              key={proposal.id}
              proposal={proposal}
              onClick={() => onNavigate(`proposal/${proposal.id}`)}
            />
          ))
        ) : (
          <div className={styles.empty}>No proposals found</div>
        )}
      </div>
    </div>
  );
}

