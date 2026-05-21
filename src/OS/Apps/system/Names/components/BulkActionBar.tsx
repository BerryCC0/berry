"use client";

/**
 * Pinned bar shown above the names list when in bulk-select mode.
 * Shows the selection count + cancel + a row of action buttons.
 */

import styles from "./BulkActionBar.module.css";

export interface BulkAction {
  label: string;
  onClick: () => void;
  /** Whether the action can run with the current selection. */
  enabled: boolean;
  /** Tooltip text shown when disabled — explains why. */
  disabledReason?: string;
  variant?: "default" | "primary";
}

interface BulkActionBarProps {
  count: number;
  onCancel: () => void;
  actions: BulkAction[];
}

export function BulkActionBar({ count, onCancel, actions }: BulkActionBarProps) {
  return (
    <div className={styles.bar}>
      <span className={styles.count}>{count} selected</span>
      <div className={styles.spacer} />
      <button type="button" className={styles.cancel} onClick={onCancel}>
        Cancel
      </button>
      {actions.map((a, i) => (
        <button
          key={i}
          type="button"
          className={`${styles.action} ${a.variant === "primary" ? styles.primary : ""}`}
          onClick={a.onClick}
          disabled={!a.enabled || count === 0}
          title={a.enabled ? undefined : a.disabledReason}
        >
          {a.label}
        </button>
      ))}
    </div>
  );
}
