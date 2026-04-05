"use client";

/**
 * SettingRow Component
 * Individual setting row with label and control
 */

import styles from "./SettingRow.module.css";

interface SettingRowProps {
  label: string;
  description?: string;
  layout?: "inline" | "stacked";
  children: React.ReactNode;
}

export function SettingRow({ label, description, layout = "inline", children }: SettingRowProps) {
  return (
    <div className={`${styles.row} ${layout === "stacked" ? styles.rowStacked : ""}`}>
      <div className={styles.labelContainer}>
        <span className={styles.label}>{label}</span>
        {description && <span className={styles.description}>{description}</span>}
      </div>
      <div className={layout === "stacked" ? styles.controlStacked : styles.control}>{children}</div>
    </div>
  );
}

interface SettingGroupProps {
  title: string;
  children: React.ReactNode;
}

export function SettingGroup({ title, children }: SettingGroupProps) {
  return (
    <div className={styles.group}>
      <h3 className={styles.groupTitle}>{title}</h3>
      <div className={styles.groupContent}>{children}</div>
    </div>
  );
}

