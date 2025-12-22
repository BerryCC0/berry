"use client";

/**
 * SettingRow Component
 * Individual setting row with label and control
 */

import styles from "./SettingRow.module.css";

interface SettingRowProps {
  label: string;
  description?: string;
  children: React.ReactNode;
}

export function SettingRow({ label, description, children }: SettingRowProps) {
  return (
    <div className={styles.row}>
      <div className={styles.labelContainer}>
        <span className={styles.label}>{label}</span>
        {description && <span className={styles.description}>{description}</span>}
      </div>
      <div className={styles.control}>{children}</div>
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

