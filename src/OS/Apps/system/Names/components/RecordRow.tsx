"use client";

/**
 * RecordRow — one ENS record (text / addr / contenthash).
 *
 * Three modes:
 *   - View (default): label + value + optional pencil
 *   - Edit: inline text input with cancel/save (P4 hooks it up)
 *   - Custom editor: a button that opens a modal (P7 avatar picker)
 *
 * For P3 (Lookup), only view mode is used. P4 wires onEdit/onChange for
 * inline editing.
 */

import { useState, type ReactNode } from "react";
import styles from "./RecordRow.module.css";

interface RecordRowProps {
  label: string;
  value: string | null | undefined;
  /** Pre-rendered value (image, badge, etc.) — falls back to text when omitted. */
  renderValue?: ReactNode;
  /** Pencil icon visible only when editable + onEdit provided. */
  editable?: boolean;
  /** Show inline editor immediately when clicked. P4. */
  onChange?: (next: string) => void;
  /** Open a custom editor (modal). Used by avatar row (P7). */
  customEditor?: () => void;
  /** Display the value in monospace font (addresses, hashes). */
  mono?: boolean;
  placeholder?: string;
  /** Leading element — e.g. ChainBadge for address rows. */
  leading?: ReactNode;
  /** Mark this row as having unsaved changes. */
  isDirty?: boolean;
}

export function RecordRow({
  label,
  value,
  renderValue,
  editable = false,
  onChange,
  customEditor,
  mono = false,
  placeholder = "—",
  leading,
  isDirty = false,
}: RecordRowProps) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(value ?? "");

  const startEdit = () => {
    if (customEditor) {
      customEditor();
      return;
    }
    if (!onChange) return;
    setDraft(value ?? "");
    setEditing(true);
  };

  const cancel = () => setEditing(false);

  const save = () => {
    onChange?.(draft);
    setEditing(false);
  };

  return (
    <div className={`${styles.row} ${isDirty ? styles.dirty : ""}`}>
      {leading && <div className={styles.leading}>{leading}</div>}
      <div className={styles.label}>{label}</div>
      {editing ? (
        <div className={styles.editing}>
          <input
            type="text"
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            className={`${styles.input} ${mono ? styles.mono : ""}`}
            autoFocus
          />
          <button type="button" className={styles.smallButton} onClick={cancel}>
            Cancel
          </button>
          <button
            type="button"
            className={`${styles.smallButton} ${styles.smallPrimary}`}
            onClick={save}
          >
            Done
          </button>
        </div>
      ) : (
        <div className={`${styles.value} ${mono ? styles.mono : ""}`}>
          {renderValue ?? (value || <span className={styles.placeholder}>{placeholder}</span>)}
        </div>
      )}
      {!editing && editable && (
        <button
          type="button"
          className={styles.pencil}
          onClick={startEdit}
          aria-label={`Edit ${label}`}
          title={`Edit ${label}`}
        >
          ✎
        </button>
      )}
    </div>
  );
}
