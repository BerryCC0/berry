"use client";

/**
 * 3-row skeleton matching NameListItem dimensions during initial load.
 * Pulse animation reuses the pattern from WalletPanel's TokenList.
 */

import styles from "./NameListSkeleton.module.css";

export function NameListSkeleton({ rows = 3 }: { rows?: number }) {
  return (
    <ul className={styles.list} aria-busy>
      {Array.from({ length: rows }).map((_, i) => (
        <li key={i} className={styles.row}>
          <div className={styles.avatar} />
          <div className={styles.identity}>
            <div className={styles.line} style={{ width: "60%" }} />
            <div className={styles.line} style={{ width: "40%", height: 10 }} />
          </div>
        </li>
      ))}
    </ul>
  );
}
