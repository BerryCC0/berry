'use client';

/**
 * SaveAsDialog — prompts for a project name when saving as a new project.
 * Replaces `window.prompt()` with the shared Dialog primitive so styling
 * matches the rest of Berry OS.
 */

import { useEffect, useRef, useState } from 'react';
import { Dialog } from '@/OS/Primitives';
import styles from './SaveAsDialog.module.css';

interface SaveAsDialogProps {
  open: boolean;
  initialName: string;
  onClose: () => void;
  onConfirm: (name: string) => void;
}

export function SaveAsDialog({
  open,
  initialName,
  onClose,
  onConfirm,
}: SaveAsDialogProps) {
  const [name, setName] = useState(initialName);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (open) {
      setName(initialName);
      // Focus + select-all once the portal mounts.
      const t = setTimeout(() => {
        inputRef.current?.focus();
        inputRef.current?.select();
      }, 0);
      return () => clearTimeout(t);
    }
  }, [open, initialName]);

  function handleConfirm(): void {
    const trimmed = name.trim();
    if (!trimmed) return;
    onConfirm(trimmed);
  }

  return (
    <Dialog
      open={open}
      onClose={onClose}
      title="Save As…"
      width={400}
      actions={[
        { label: 'Cancel', variant: 'default' },
        {
          label: 'Save',
          variant: 'primary',
          onClick: handleConfirm,
          closeOnClick: false,
        },
      ]}
    >
      <div className={styles.fieldRow}>
        <span className={styles.fieldLabel}>Project name</span>
        <input
          ref={inputRef}
          className={styles.input}
          type="text"
          value={name}
          onChange={(e) => setName(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter') {
              e.preventDefault();
              handleConfirm();
            }
          }}
          placeholder="Untitled"
        />
      </div>
    </Dialog>
  );
}
