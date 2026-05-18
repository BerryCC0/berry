/**
 * ActionTemplatePicker
 * Modal "pick a template type" trigger. Used by MetaProposeEditor for
 * selecting the INNER template inside a meta-propose flow. The outer
 * action flow uses ActionEditorModal (which embeds TemplatePickerView
 * directly as its step 1 and adds parameter editing on step 2).
 */

'use client';

import { useState, useEffect } from 'react';
import {
  TemplatePickerView,
  type TemplateGroup,
} from './TemplatePickerView';
import styles from './ActionTemplatePicker.module.css';

interface ActionTemplatePickerProps {
  groups: TemplateGroup[];
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  disabled?: boolean;
}

function findSelected(
  groups: TemplateGroup[],
  value: string,
): { label: string; group: string } | null {
  for (const group of groups) {
    const found = group.options.find((opt) => opt.value === value);
    if (found) return { label: found.label, group: group.label };
  }
  return null;
}

export function ActionTemplatePicker({
  groups,
  value,
  onChange,
  placeholder = 'Select transaction type...',
  disabled = false,
}: ActionTemplatePickerProps) {
  const [isOpen, setIsOpen] = useState(false);

  const nonEmptyGroups = groups.filter((g) => g.options.length > 0);
  const selectedOption = findSelected(nonEmptyGroups, value);

  // Escape + body scroll lock while open.
  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setIsOpen(false);
    };
    document.addEventListener('keydown', handleKeyDown);
    const originalOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.removeEventListener('keydown', handleKeyDown);
      document.body.style.overflow = originalOverflow;
    };
  }, [isOpen]);

  const handleBackdropClick = (e: React.MouseEvent) => {
    if (e.target === e.currentTarget) setIsOpen(false);
  };

  return (
    <div className={styles.container}>
      <button
        type="button"
        className={`${styles.trigger} ${isOpen ? styles.open : ''} ${value ? styles.hasValue : ''} ${disabled ? styles.disabled : ''}`}
        onClick={() => !disabled && setIsOpen(true)}
        aria-haspopup="dialog"
        aria-expanded={isOpen}
        disabled={disabled}
      >
        <span className={styles.triggerContent}>
          {selectedOption ? (
            <span className={styles.triggerLabel}>{selectedOption.label}</span>
          ) : (
            <span className={styles.triggerPlaceholder}>{placeholder}</span>
          )}
        </span>
        <span className={styles.arrow}>▼</span>
      </button>

      {isOpen && (
        <div
          className={styles.overlay}
          onClick={handleBackdropClick}
          role="dialog"
          aria-modal="true"
          aria-label="Select transaction type"
        >
          <div className={styles.modal}>
            <div className={styles.modalHeader}>
              <span className={styles.modalTitle}>Select transaction type</span>
              <button
                type="button"
                className={styles.closeButton}
                onClick={() => setIsOpen(false)}
                aria-label="Close"
              >
                ×
              </button>
            </div>

            <TemplatePickerView
              groups={nonEmptyGroups}
              value={value}
              initialTab={selectedOption?.group}
              onSelect={(v) => {
                onChange(v);
                setIsOpen(false);
              }}
            />

            {value && (
              <div className={styles.modalFooter}>
                <button
                  type="button"
                  className={styles.clearButton}
                  onClick={() => {
                    onChange('');
                    setIsOpen(false);
                  }}
                >
                  Clear selection
                </button>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
