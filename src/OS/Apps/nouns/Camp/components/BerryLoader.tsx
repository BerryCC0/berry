/**
 * BerryLoader Component
 * Displays the berry glyph animation as a loading indicator
 */

'use client';

import styles from './BerryLoader.module.css';

export function BerryLoader() {
  return (
    <div className={styles.container}>
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src="/icons/loader.gif"
        alt="Loading..."
        className={styles.glyph}
      />
    </div>
  );
}
