"use client";

/**
 * Inline warning banner. Use for irreversible action notices.
 * Tones: warn (amber) and danger (red).
 */

import type { ReactNode } from "react";
import styles from "./WarningBanner.module.css";

interface WarningBannerProps {
  tone?: "warn" | "danger";
  icon?: string;
  children: ReactNode;
}

export function WarningBanner({ tone = "warn", icon = "⚠", children }: WarningBannerProps) {
  return (
    <div className={`${styles.banner} ${styles[tone]}`}>
      <span className={styles.icon} aria-hidden>{icon}</span>
      <div className={styles.body}>{children}</div>
    </div>
  );
}
