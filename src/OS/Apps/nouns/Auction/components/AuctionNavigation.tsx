/**
 * AuctionNavigation Component
 * Navigation controls for browsing Nouns
 */

'use client';

import { useState, FormEvent } from 'react';
import { formatCurrentDate } from '../utils/auctionHelpers';
import styles from './AuctionNavigation.module.css';

interface AuctionNavigationProps {
  currentNounId: string | null;
  viewingNounId: string | null;
  onPrevious: () => void;
  onNext: () => void;
  onSearch: (nounId: string) => void;
  onCurrent: () => void;
}

export function AuctionNavigation({
  currentNounId,
  viewingNounId,
  onPrevious,
  onNext,
  onSearch,
  onCurrent,
}: AuctionNavigationProps) {
  const [searchInput, setSearchInput] = useState('');

  const handleSearchSubmit = (e: FormEvent) => {
    e.preventDefault();
    const searchId = Number(searchInput);
    
    if (isNaN(searchId) || searchId < 1) {
      return;
    }
    
    if (currentNounId && searchId > Number(currentNounId)) {
      return;
    }
    
    onSearch(String(searchId));
    setSearchInput('');
  };

  const isAtFirst = viewingNounId === '1';
  const isAtCurrent = !viewingNounId || viewingNounId === currentNounId;

  return (
    <div className={styles.navigation}>
      <div className={styles.controls}>
        <button
          onClick={onPrevious}
          disabled={isAtFirst}
          className={styles.navButton}
          aria-label="Previous Noun"
        >
          ←
        </button>
        
        <span className={styles.date}>{formatCurrentDate()}</span>
        
        <button
          onClick={onNext}
          disabled={isAtCurrent}
          className={styles.navButton}
          aria-label="Next Noun"
        >
          →
        </button>
      </div>

      <form onSubmit={handleSearchSubmit} className={styles.searchForm}>
        <input
          type="text"
          placeholder="Search ID"
          value={searchInput}
          onChange={(e) => setSearchInput(e.target.value)}
          className={styles.searchInput}
        />
      </form>

      <button
        onClick={onCurrent}
        disabled={isAtCurrent}
        className={styles.currentButton}
      >
        Current
      </button>
    </div>
  );
}

