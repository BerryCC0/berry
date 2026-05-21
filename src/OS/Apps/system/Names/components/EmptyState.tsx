"use client";

/**
 * Centered empty state — icon, title, body copy, optional CTA.
 * Used by every view to communicate "nothing here yet" or "connect first".
 */

import type { ReactNode } from "react";
import styles from "./EmptyState.module.css";

interface EmptyStateProps {
  /** Optional emoji or short string used as a visual anchor. */
  icon?: string;
  title: string;
  description?: ReactNode;
  cta?: { label: string; onClick: () => void };
}

export function EmptyState({ icon = "✦", title, description, cta }: EmptyStateProps) {
  return (
    <div className={styles.container}>
      <div className={styles.icon} aria-hidden>{icon}</div>
      <div className={styles.title}>{title}</div>
      {description && <div className={styles.description}>{description}</div>}
      {cta && (
        <button type="button" className={styles.cta} onClick={cta.onClick}>
          {cta.label}
        </button>
      )}
    </div>
  );
}
