/**
 * Inline editor for a single proposal action.
 *
 * Used in two modes:
 *   • Add  — no initial values; user picks an action type, fills fields, saves.
 *   • Edit — pre-populated from an existing staged action; same shape, the
 *            picker stays editable so the user can change action type entirely
 *            without losing their place in the staged list.
 *
 * Validation is delegated to the action def's `encode()` — calling it on
 * save throws a user-readable message on bad input. The editor catches and
 * surfaces it inline; the parent never sees an invalid StagedAction.
 *
 * Action types are presented as a flat <select> grouped by category. With
 * 7 defs today the flat list reads cleanly; if the registry grows past
 * ~15 we should switch to a categorised picker UI.
 */
'use client';

import { useMemo, useState } from 'react';
import {
  FN_ACTION_DEFS,
  getActionDef,
  type FNActionCategory,
  type StagedAction,
} from '../../utils/proposalActions';
import { FieldInput } from './FieldInput';
import styles from './ActionEditor.module.css';

interface Props {
  /** Initial staged action when editing; undefined when adding. */
  initial?: StagedAction;
  onCancel: () => void;
  onSave: (staged: StagedAction) => void;
  /** Disable inputs while a parent submit is in flight. */
  disabled?: boolean;
}

const CATEGORY_LABELS: Record<FNActionCategory, string> = {
  'eth-transfer': 'Treasury',
  'auction-admin': 'Auction Admin',
  custom: 'Custom',
};

export function ActionEditor({ initial, onCancel, onSave, disabled }: Props) {
  // Track defId and values separately so changing action type resets the
  // form cleanly. The picker can switch types without committing.
  const [defId, setDefId] = useState<string>(
    initial?.defId ?? FN_ACTION_DEFS[0].id,
  );
  const [values, setValues] = useState<Record<string, string>>(
    initial?.values ?? {},
  );
  const [validationError, setValidationError] = useState<string | null>(null);

  const def = getActionDef(defId);

  const groupedOptions = useMemo(() => {
    // Build <optgroup>s by category, preserving the registry order within
    // each group (which is the visual order we want).
    const groups: Record<FNActionCategory, typeof FN_ACTION_DEFS[number][]> = {
      'eth-transfer': [],
      'auction-admin': [],
      custom: [],
    };
    for (const d of FN_ACTION_DEFS) groups[d.category].push(d);
    return groups;
  }, []);

  const onTypeChange = (nextId: string) => {
    setDefId(nextId);
    // Don't carry stale values across types — each def's fields are different.
    setValues({});
    setValidationError(null);
  };

  const onFieldChange = (name: string, next: string) => {
    setValues((prev) => ({ ...prev, [name]: next }));
    // Clear validation error as soon as the user starts editing.
    if (validationError) setValidationError(null);
  };

  const trySave = () => {
    if (!def) return;
    try {
      // encode() is the action def's own validator. If it returns we know
      // the action is well-formed and the parent can use it directly.
      def.encode(values);
    } catch (e) {
      setValidationError(e instanceof Error ? e.message : 'Invalid input');
      return;
    }
    onSave({ defId: def.id, values });
  };

  if (!def) {
    // Should be unreachable — the registry is closed. Defensive return for
    // the case where a stored draft references a removed def.
    return (
      <div className={styles.editor}>
        <div className={styles.editorErr}>Unknown action type: {defId}</div>
        <div className={styles.editorActions}>
          <button type="button" onClick={onCancel} className={styles.cancelBtn}>
            Close
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className={styles.editor}>
      <div className={styles.editorHeader}>
        <span className={styles.editorTitle}>
          {initial ? 'Edit action' : 'Add action'}
        </span>
      </div>

      <div className={styles.fieldWrap}>
        <label htmlFor="fn-action-type-select" className={styles.label}>
          Action type
        </label>
        <select
          id="fn-action-type-select"
          value={defId}
          onChange={(e) => onTypeChange(e.target.value)}
          disabled={disabled}
          className={styles.select}
        >
          {(Object.keys(groupedOptions) as FNActionCategory[]).map((cat) =>
            groupedOptions[cat].length === 0 ? null : (
              <optgroup key={cat} label={CATEGORY_LABELS[cat]}>
                {groupedOptions[cat].map((d) => (
                  <option key={d.id} value={d.id}>
                    {d.name}
                  </option>
                ))}
              </optgroup>
            ),
          )}
        </select>
        <span className={styles.helpText}>{def.description}</span>
      </div>

      {def.fields.length === 0 && (
        // No-arg actions (pause/unpause) — there's nothing to fill, but the
        // user should see confirmation that the choice is complete.
        <div className={styles.noFields}>
          No arguments. This action will call <code>{def.name}</code> with no
          parameters.
        </div>
      )}

      {def.fields.map((field) => (
        <FieldInput
          key={field.name}
          field={field}
          value={values[field.name] ?? ''}
          onChange={(v) => onFieldChange(field.name, v)}
          disabled={disabled}
        />
      ))}

      {validationError && (
        <div className={styles.editorErr}>{validationError}</div>
      )}

      <div className={styles.editorActions}>
        <button
          type="button"
          onClick={onCancel}
          disabled={disabled}
          className={styles.cancelBtn}
        >
          Cancel
        </button>
        <button
          type="button"
          onClick={trySave}
          disabled={disabled}
          className={styles.saveBtn}
        >
          {initial ? 'Save changes' : 'Add to proposal'}
        </button>
      </div>
    </div>
  );
}
