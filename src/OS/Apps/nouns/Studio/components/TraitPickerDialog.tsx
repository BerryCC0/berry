'use client';

/**
 * TraitPickerDialog — generic dialog wrapping ForkTraitPicker.
 *
 * Suitable for "replace this layer's pixels with an existing trait" actions
 * (per-layer Fork). Used by the layers panel and by the New Project dialog's
 * Fork-Trait tab.
 */

import { useState } from 'react';
import { Dialog } from '@/OS/Primitives';
import { ForkTraitPicker } from './ForkTraitPicker';
import type { NounPart } from '../types';
import styles from './TraitPickerDialog.module.css';

interface TraitPickerDialogProps {
  open: boolean;
  onClose: () => void;
  /** Called with the picked (part, index) after the user confirms. */
  onConfirm: (part: NounPart, index: number) => void;
  /** Title shown in the dialog header. */
  title?: string;
  /** Locks the part selector when set. */
  lockedPart?: NounPart;
  /** Initial active part. Defaults to `head` or `lockedPart` if provided. */
  initialPart?: NounPart;
}

export function TraitPickerDialog({
  open,
  onClose,
  onConfirm,
  title = 'Choose a trait',
  lockedPart,
  initialPart,
}: TraitPickerDialogProps) {
  const [selection, setSelection] = useState<{
    part: NounPart;
    index: number;
  } | null>(null);

  const handleSelect = (part: NounPart, index: number) => {
    setSelection({ part, index });
  };

  const handleConfirm = () => {
    if (!selection) return;
    onConfirm(selection.part, selection.index);
    onClose();
    setSelection(null);
  };

  return (
    <Dialog
      open={open}
      onClose={() => {
        setSelection(null);
        onClose();
      }}
      title={title}
      width={560}
      actions={[
        { label: 'Cancel', variant: 'default' },
        {
          label: 'Use this trait',
          variant: 'primary',
          onClick: handleConfirm,
          closeOnClick: false,
        },
      ]}
    >
      <div className={styles.body}>
        <p className={styles.helpText}>
          Pick a trait from the bundled snapshot, or refresh from the chain to
          see new on-chain additions.
        </p>
        <ForkTraitPicker
          initialPart={initialPart}
          lockedPart={lockedPart}
          onSelect={handleSelect}
          selectedIndex={selection?.index}
        />
      </div>
    </Dialog>
  );
}
