"use client";

/**
 * Finder App - Placeholder
 * File browser for Berry OS
 */

import type { AppComponentProps } from "@/OS/types/app";
import styles from "./Finder.module.css";

export function Finder({ windowId, appId }: AppComponentProps) {
  return (
    <div className={styles.container}>
      <div className={styles.sidebar}>
        <div className={styles.sidebarItem}>📁 Desktop</div>
        <div className={styles.sidebarItem}>📄 Documents</div>
        <div className={styles.sidebarItem}>🖼️ Pictures</div>
        <div className={styles.sidebarItem}>🎵 Music</div>
      </div>
      <div className={styles.content}>
        <div className={styles.placeholder}>
          <h2>Finder</h2>
          <p>File browser coming soon</p>
          <p className={styles.meta}>Window: {windowId}</p>
          <p className={styles.meta}>App: {appId}</p>
        </div>
      </div>
    </div>
  );
}

