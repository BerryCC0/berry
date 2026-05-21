"use client";

/**
 * RecordSection — titled group of RecordRow rows. Provides the visual
 * grouping ("Profile", "Addresses", "Content Hash", "Subnames", "Fuses")
 * shown in NameDetail.
 */

import type { ReactNode } from "react";
import styles from "./RecordSection.module.css";

interface RecordSectionProps {
  title: string;
  /** Optional trailing element in the header — e.g. an "Add" button. */
  action?: ReactNode;
  children?: ReactNode;
  /** Render even when empty. Defaults to true. */
  showWhenEmpty?: boolean;
  /** Copy displayed when children is null/empty. */
  emptyLabel?: string;
}

export function RecordSection({
  title,
  action,
  children,
  showWhenEmpty = true,
  emptyLabel = "No records",
}: RecordSectionProps) {
  const hasContent = !!children && (Array.isArray(children) ? children.length > 0 : true);
  if (!hasContent && !showWhenEmpty) return null;

  return (
    <section className={styles.section}>
      <header className={styles.header}>
        <h3 className={styles.title}>{title}</h3>
        {action && <div className={styles.action}>{action}</div>}
      </header>
      <div className={styles.body}>
        {hasContent ? children : <div className={styles.empty}>{emptyLabel}</div>}
      </div>
    </section>
  );
}
