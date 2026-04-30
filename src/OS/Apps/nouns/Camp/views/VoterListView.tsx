/**
 * VoterListView
 * List of delegates with voting power
 * Styled to match the Digest component's voters feed
 */

'use client';

import { useState, useMemo, useEffect, useRef } from 'react';
import { useInfiniteVoters } from '../hooks';
import { BerryLoader } from '../components/BerryLoader';
import { VoterIdentity } from '../components/VoterIdentity';
import { Toolbar, useToolbar, ToolbarBack, ToolbarTitle, ToolbarSelect } from '../components/CampToolbar';
import type { Voter, VoterSort } from '../types';
import type { CampToolbarContext } from '../Camp';
import styles from './VoterListView.module.css';

// Treasury addresses to filter from voter list
const TREASURY_ADDRESSES = [
  '0xb1a32fc9f9d8b2cf86c068cae13108809547ef71', // treasury (nouns.eth)
  '0x0bc3807ec262cb779b38d65b38158acc3bfede10', // treasuryV1
];

interface VoterListViewProps {
  onNavigate: (path: string) => void;
  onBack: () => void;
  toolbar?: CampToolbarContext;
}

export function VoterListView({ onNavigate, onBack, toolbar }: VoterListViewProps) {
  const [sort, setSort] = useState<VoterSort>('power');

  const {
    voters,
    isLoading,
    error,
    hasNextPage,
    fetchNextPage,
    isFetchingNextPage,
  } = useInfiniteVoters(sort);
  const { isModern } = useToolbar();
  const tb = toolbar;

  // Filter out treasury addresses from voters
  const filteredVoters = useMemo(() => {
    if (!voters || voters.length === 0) return [];
    return voters.filter(v => !TREASURY_ADDRESSES.includes(v.id.toLowerCase()));
  }, [voters]);

  // Infinite scroll: when the sentinel becomes visible inside .list, fetch next page.
  const listRef = useRef<HTMLDivElement>(null);
  const sentinelRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const sentinel = sentinelRef.current;
    const root = listRef.current;
    if (!sentinel || !root || !hasNextPage || isFetchingNextPage) return;

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting) {
          fetchNextPage();
        }
      },
      { root, rootMargin: '200px', threshold: 0 },
    );

    observer.observe(sentinel);
    return () => observer.disconnect();
  }, [hasNextPage, isFetchingNextPage, fetchNextPage]);

  const renderVoterItem = (voter: Voter) => {
    const votes = Number(voter.delegatedVotes);
    
    return (
      <div 
        key={voter.id}
        className={styles.voterItem}
        onClick={() => onNavigate(`voter/${voter.id}`)}
      >
        <div className={styles.voterInfo}>
          <VoterIdentity address={voter.id} />
          <span className={styles.voterVotes}>{votes} vote{votes !== 1 ? 's' : ''}</span>
        </div>
      </div>
    );
  };

  if (error) {
    return (
      <div className={styles.error}>
        <button className={styles.backButton} onClick={onBack}>← Back</button>
        <p>Failed to load voters</p>
        <p className={styles.errorDetail}>{error.message}</p>
      </div>
    );
  }

  return (
    <div className={styles.container}>
      {tb && (
        <Toolbar
          leading={
            <>
              <ToolbarBack onClick={onBack} styles={tb.styles} />
              <ToolbarTitle styles={tb.styles}>Voters</ToolbarTitle>
            </>
          }
          center={
            <ToolbarSelect
              value={sort}
              onChange={setSort}
              options={[
                { value: 'power', label: 'Voting Power' },
                { value: 'votes', label: 'Votes Cast' },
                { value: 'represented', label: 'Delegators' },
              ]}
              styles={tb.styles}
            />
          }
        />
      )}
      {!isModern && <div className={styles.navBar}>
        <button className={styles.backButton} onClick={onBack}>← Back</button>
      </div>}
      {!isModern && <div className={styles.controls}>
        <select
          className={styles.select}
          value={sort}
          onChange={(e) => setSort(e.target.value as VoterSort)}
        >
          <option value="power">Voting Power</option>
          <option value="votes">Votes Cast</option>
          <option value="represented">Delegators</option>
        </select>
      </div>}

      <div className={styles.list} ref={listRef}>
        {isLoading && filteredVoters.length === 0 ? (
          <BerryLoader />
        ) : filteredVoters.length > 0 ? (
          <>
            {filteredVoters.map(voter => renderVoterItem(voter))}
            {hasNextPage && <div ref={sentinelRef} className={styles.scrollSentinel} />}
            {isFetchingNextPage && (
              <div className={styles.loadingMore}>Loading more...</div>
            )}
          </>
        ) : (
          <div className={styles.empty}>No voters found</div>
        )}
      </div>
    </div>
  );
}
