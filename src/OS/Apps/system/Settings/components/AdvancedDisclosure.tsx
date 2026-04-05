"use client";

/**
 * AdvancedDisclosure — Styled <details> for hiding power-user settings.
 */

import styles from "./AdvancedDisclosure.module.css";

interface AdvancedDisclosureProps {
  label?: string;
  defaultOpen?: boolean;
  children: React.ReactNode;
}

export function AdvancedDisclosure({
  label = "Advanced",
  defaultOpen = false,
  children,
}: AdvancedDisclosureProps) {
  return (
    <details className={styles.disclosure} open={defaultOpen || undefined}>
      <summary className={styles.summary}>
        <span className={styles.arrow}>&#9654;</span>
        <span className={styles.label}>{label}</span>
      </summary>
      <div className={styles.content}>{children}</div>
    </details>
  );
}
