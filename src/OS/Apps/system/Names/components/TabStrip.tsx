"use client";

/**
 * TabStrip — horizontal tab nav. Scrolls horizontally when content
 * overflows the container width (mobile / narrow windows).
 */

import styles from "./TabStrip.module.css";

export interface Tab<T extends string = string> {
  id: T;
  label: string;
}

interface TabStripProps<T extends string = string> {
  tabs: Tab<T>[];
  active: T;
  onChange: (id: T) => void;
}

export function TabStrip<T extends string = string>({ tabs, active, onChange }: TabStripProps<T>) {
  return (
    <nav className={styles.strip} aria-label="View tabs">
      <div className={styles.inner}>
        {tabs.map((t) => (
          <button
            key={t.id}
            type="button"
            className={`${styles.tab} ${active === t.id ? styles.active : ""}`}
            onClick={() => onChange(t.id)}
            aria-pressed={active === t.id}
          >
            {t.label}
          </button>
        ))}
      </div>
    </nav>
  );
}
