/**
 * Schema-driven field renderer for the proposal action editor.
 *
 * One component per FNActionField.type:
 *   • address → reuses Camp's AddressInput (handles ENS resolution)
 *   • amount  → number input with decimals validation hint
 *   • number  → integer/unscaled number input
 *   • text    → input (one-line) OR monospaced textarea for `calldata`
 *
 * Keeps the action def as the schema source of truth — adding a new field
 * type means adding a case here.
 */
'use client';

import { AddressInput } from '@/OS/Apps/nouns/Camp/components/CreateProposal/AddressInput';
import type { FNActionField } from '../../utils/proposalActions';
import styles from './FieldInput.module.css';

interface Props {
  field: FNActionField;
  value: string;
  onChange: (next: string) => void;
  disabled?: boolean;
}

export function FieldInput({ field, value, onChange, disabled }: Props) {
  const id = `fn-action-field-${field.name}`;
  const isCalldata = field.name === 'calldata';

  return (
    <div className={styles.fieldWrap}>
      <label htmlFor={id} className={styles.label}>
        {field.label}
        {field.required && <span className={styles.required}>*</span>}
      </label>

      {field.type === 'address' ? (
        <AddressInput
          value={value}
          onChange={onChange}
          placeholder={field.placeholder ?? '0x… or name.eth'}
          disabled={disabled}
          helpText={field.helpText}
        />
      ) : field.type === 'amount' ? (
        <input
          id={id}
          type="number"
          inputMode="decimal"
          // `step` lets the browser increment by reasonable amounts; the
          // action's encode() does the actual scaling via parseUnits.
          step="any"
          min={field.min ?? 0}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={field.placeholder ?? '0.0'}
          disabled={disabled}
          className={styles.input}
        />
      ) : field.type === 'number' ? (
        <input
          id={id}
          type="number"
          inputMode="numeric"
          step={1}
          min={field.min ?? 0}
          max={field.max}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={field.placeholder}
          disabled={disabled}
          className={styles.input}
        />
      ) : isCalldata ? (
        // Calldata is opaque hex — possibly long. Use a monospaced multiline
        // box so the user can paste pre-encoded bytes without horizontal
        // scrolling. Other text fields stay single-line.
        <textarea
          id={id}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={field.placeholder}
          disabled={disabled}
          rows={3}
          className={`${styles.input} ${styles.mono}`}
          spellCheck={false}
        />
      ) : (
        <input
          id={id}
          type="text"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={field.placeholder}
          disabled={disabled}
          className={styles.input}
          spellCheck={false}
        />
      )}

      {/* AddressInput owns its own help text; for everything else we render
       *  it here so the same prop on the field def works uniformly. */}
      {field.helpText && field.type !== 'address' && (
        <span className={styles.helpText}>{field.helpText}</span>
      )}
    </div>
  );
}
