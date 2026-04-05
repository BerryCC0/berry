/**
 * SearchOverlay — Message search panel
 */

"use client";

import { useCallback } from "react";
import { useBimStore } from "../../store/bimStore";
import { useSearch } from "../../hooks/useSearch";
import { truncateAddress, formatMessageTime } from "../../utils";
import styles from "../../BIM.module.css";

export function SearchOverlay() {
  const { toggleSearch } = useBimStore();
  const { query, results, search, clearSearch } = useSearch();

  const handleClose = useCallback(() => {
    clearSearch();
    toggleSearch();
  }, [clearSearch, toggleSearch]);

  return (
    <div className={styles.searchOverlay}>
      <div className={styles.searchHeader}>
        <input
          className={styles.searchInput}
          value={query}
          onChange={(e) => search(e.target.value)}
          placeholder="Search messages..."
          autoFocus
        />
        <button className={styles.searchClose} onClick={handleClose}>
          ✕
        </button>
      </div>

      <div className={styles.searchResults}>
        {results.length === 0 && query && (
          <div className={styles.searchEmpty}>
            No messages found for &ldquo;{query}&rdquo;
          </div>
        )}

        {results.length === 0 && !query && (
          <div className={styles.searchEmpty}>
            Type to search across messages
          </div>
        )}

        {results.map((result) => (
          <div key={result.message.id} className={styles.searchResult}>
            <div className={styles.searchResultSender}>
              {truncateAddress(result.message.senderAddress, 4)}
            </div>
            <div className={styles.searchResultText}>
              {highlightMatch(result.message.content, query)}
            </div>
            <div className={styles.searchResultTime}>
              {formatMessageTime(result.message.sentAt)}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function highlightMatch(text: string, query: string): React.ReactNode {
  if (!query) return text;
  const lower = text.toLowerCase();
  const idx = lower.indexOf(query.toLowerCase());
  if (idx === -1) return text;

  return (
    <>
      {text.slice(0, idx)}
      <strong style={{ color: "var(--berry-accent)" }}>
        {text.slice(idx, idx + query.length)}
      </strong>
      {text.slice(idx + query.length)}
    </>
  );
}
