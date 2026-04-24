/**
 * Chart Skeleton
 * Placeholder shown in place of a chart while upstream data is loading,
 * so users can distinguish "loading" from "genuinely empty."
 */

'use client';

import { memo } from 'react';
import styles from '../Clients.module.css';

interface ChartSkeletonProps {
  title: string;
  /** Number of bar placeholders to render. Defaults to 4. */
  bars?: number;
  /** When true, renders a static failed-state instead of animated loading. */
  error?: boolean;
}

export const ChartSkeleton = memo(function ChartSkeleton({ title, bars = 4, error = false }: ChartSkeletonProps) {
  // Deterministic pseudo-random bar heights so the skeleton doesn't jitter on re-render
  const heights = Array.from({ length: bars }, (_, i) => 30 + ((i * 37) % 60));
  const containerClass = error
    ? `${styles.chartContainer} ${styles.chartSkeleton} ${styles.chartSkeletonError}`
    : `${styles.chartContainer} ${styles.chartSkeleton}`;
  return (
    <div className={styles.chartCard} aria-busy={!error} aria-live="polite">
      <div className={styles.chartTitle}>{title}</div>
      <div className={containerClass}>
        <div className={styles.chartSkeletonBars}>
          {heights.map((h, i) => (
            <div
              key={i}
              className={styles.chartSkeletonBar}
              style={{ height: `${h}%` }}
            />
          ))}
        </div>
        <div className={styles.chartSkeletonLabel}>
          {error ? 'Failed to load' : 'Loading…'}
        </div>
      </div>
    </div>
  );
});
