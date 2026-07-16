/**
 * V2 auction navigation — prev / next through nouns, search by id, jump to
 * the current live auction. Self-contained (lives inside the Auction tab, not
 * the window toolbar).
 */

'use client';

import { useState, type FormEvent } from 'react';
import styles from './V2AuctionNav.module.css';

interface Props {
  /** The current live auction's noun id (upper bound for navigation). */
  currentNounId: number | null;
  /** The noun being viewed, or null when viewing the live auction. */
  viewingNounId: number | null;
  onPrevious: () => void;
  onNext: () => void;
  onSearch: (nounId: number) => void;
  onCurrent: () => void;
}

export function V2AuctionNav({
  currentNounId,
  viewingNounId,
  onPrevious,
  onNext,
  onSearch,
  onCurrent,
}: Props) {
  const [search, setSearch] = useState('');

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    const id = Number(search);
    if (!Number.isInteger(id) || id < 0) return;
    if (currentNounId != null && id > currentNounId) return;
    onSearch(id);
    setSearch('');
  };

  const isAtFirst = viewingNounId != null && viewingNounId <= 0;
  const isAtCurrent = viewingNounId == null || viewingNounId === currentNounId;

  return (
    <div className={styles.nav}>
      <div className={styles.controls}>
        <button
          type="button"
          className={styles.navBtn}
          onClick={onPrevious}
          disabled={isAtFirst}
          aria-label="Previous Noun"
        >
          ←
        </button>
        <button
          type="button"
          className={styles.navBtn}
          onClick={onNext}
          disabled={isAtCurrent}
          aria-label="Next Noun"
        >
          →
        </button>
      </div>

      <form onSubmit={handleSubmit} className={styles.searchForm}>
        <input
          type="number"
          min={0}
          max={currentNounId ?? undefined}
          placeholder="Go to #"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className={styles.searchInput}
          aria-label="Search by Noun id"
        />
      </form>

      <button
        type="button"
        className={styles.currentBtn}
        onClick={onCurrent}
        disabled={isAtCurrent}
      >
        Current
      </button>
    </div>
  );
}
