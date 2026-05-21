"use client";

/**
 * Pick a registration duration: 1y, 2y, 3y, 5y, or 10y.
 */

import styles from "./DurationStepper.module.css";

const OPTIONS: { years: number; seconds: number }[] = [
  { years: 1, seconds: 365 * 86400 },
  { years: 2, seconds: 2 * 365 * 86400 },
  { years: 3, seconds: 3 * 365 * 86400 },
  { years: 5, seconds: 5 * 365 * 86400 },
  { years: 10, seconds: 10 * 365 * 86400 },
];

interface DurationStepperProps {
  /** Duration in seconds. */
  value: number;
  onChange: (seconds: number) => void;
}

export function DurationStepper({ value, onChange }: DurationStepperProps) {
  return (
    <div className={styles.stepper}>
      {OPTIONS.map((opt) => (
        <button
          key={opt.years}
          type="button"
          className={`${styles.option} ${value === opt.seconds ? styles.active : ""}`}
          onClick={() => onChange(opt.seconds)}
        >
          {opt.years}y
        </button>
      ))}
    </div>
  );
}
