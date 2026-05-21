"use client";

/**
 * Horizontal step indicator for wizards (DNS Import, Register).
 * Steps before `current` show a checkmark; the active step is filled;
 * future steps are outlined.
 */

import styles from "./StepIndicator.module.css";

interface StepIndicatorProps {
  steps: string[];
  /** Zero-indexed active step. */
  current: number;
}

export function StepIndicator({ steps, current }: StepIndicatorProps) {
  return (
    <ol className={styles.list} aria-label="Steps">
      {steps.map((label, i) => {
        const isComplete = i < current;
        const isActive = i === current;
        return (
          <li
            key={label}
            className={`${styles.step} ${isComplete ? styles.complete : ""} ${isActive ? styles.active : ""}`}
          >
            <span className={styles.dot} aria-hidden>
              {isComplete ? "✓" : i + 1}
            </span>
            <span className={styles.label}>{label}</span>
            {i < steps.length - 1 && <span className={styles.connector} aria-hidden />}
          </li>
        );
      })}
    </ol>
  );
}
