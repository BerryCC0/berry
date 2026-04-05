"use client";

/**
 * PinnedAppsList — Reusable component for managing pinned apps.
 *
 * Shows chips for pinned items with × to remove. Locked items show a lock
 * icon instead. A ghost "+ Add" chip opens a dropdown to add new apps.
 */

import { useState, useRef, useEffect } from "react";
import styles from "./PinnedAppsList.module.css";

export interface PinnedApp {
  id: string;
  label: string;
}

interface PinnedAppsListProps {
  items: PinnedApp[];
  onRemove: (id: string) => void;
  onAdd: (id: string) => void;
  availableApps: { id: string; name: string }[];
  lockedIds?: string[];
  placeholder?: string;
}

export function PinnedAppsList({
  items,
  onRemove,
  onAdd,
  availableApps,
  lockedIds = [],
  placeholder = "Add app...",
}: PinnedAppsListProps) {
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Close dropdown on outside click
  useEffect(() => {
    if (!dropdownOpen) return;
    const handleClick = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setDropdownOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, [dropdownOpen]);

  const handleSelect = (id: string) => {
    onAdd(id);
    setDropdownOpen(false);
  };

  return (
    <div className={styles.pinnedList}>
      {items.length === 0 && (
        <span className={styles.emptyText}>None</span>
      )}
      {items.map((item) => {
        const isLocked = lockedIds.includes(item.id);
        return (
          <span key={item.id} className={`${styles.chip} ${isLocked ? styles.chipLocked : ""}`}>
            {item.label}
            {isLocked ? (
              <span className={styles.lockIcon} aria-label="Cannot be removed" title="Cannot be removed">
                <svg width="10" height="10" viewBox="0 0 16 16" fill="currentColor">
                  <path d="M4 7V5a4 4 0 1 1 8 0v2h1a1 1 0 0 1 1 1v5a1 1 0 0 1-1 1H3a1 1 0 0 1-1-1V8a1 1 0 0 1 1-1h1zm2 0h4V5a2 2 0 0 0-4 0v2z" />
                </svg>
              </span>
            ) : (
              <button
                type="button"
                className={styles.chipRemove}
                onClick={() => onRemove(item.id)}
                aria-label={`Remove ${item.label}`}
              >
                &times;
              </button>
            )}
          </span>
        );
      })}

      {availableApps.length > 0 && (
        <div className={styles.addWrapper} ref={dropdownRef}>
          <button
            type="button"
            className={styles.addChip}
            onClick={() => setDropdownOpen(!dropdownOpen)}
          >
            + {placeholder}
          </button>
          {dropdownOpen && (
            <div className={styles.dropdown}>
              {availableApps.map((app) => (
                <button
                  key={app.id}
                  type="button"
                  className={styles.dropdownItem}
                  onClick={() => handleSelect(app.id)}
                >
                  {app.name}
                </button>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
