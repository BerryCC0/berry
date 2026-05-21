/**
 * OctantSimulateButton
 * Drop-in "Simulate on Tenderly" button used by both Octant editors.
 *
 * Wraps the existing `useSimulation` hook with user-triggered semantics
 * (the underlying query is gated on a local `triggered` flag so the
 * simulation only runs when the user clicks the button — not on every
 * keystroke). Renders success/failure inline with a Tenderly share link
 * when the API key is configured.
 *
 * The Octant docs' Step 2 explicitly recommends doing a small test cycle
 * (deposit → report() → withdraw) on a fork before scaling up — this
 * button is the fastest path to that.
 */

'use client';

import { useMemo, useState } from 'react';
import type {
  ActionTemplateType,
  TemplateFieldValues,
} from '../../utils/actionTemplates';
import { generateActionsFromTemplate } from '../../utils/actionTemplates';
import { useSimulation } from '../../hooks/useSimulation';
import styles from './OctantSimulateButton.module.css';

interface OctantSimulateButtonProps {
  templateId: ActionTemplateType;
  fieldValues: TemplateFieldValues;
  disabled?: boolean;
}

export function OctantSimulateButton({
  templateId,
  fieldValues,
  disabled = false,
}: OctantSimulateButtonProps) {
  const [triggered, setTriggered] = useState(false);

  // Regenerate actions from the latest field values. If anything is missing,
  // `generateActionsFromTemplate` may throw — catch and surface as null so
  // the button shows a clear "fill required fields" tooltip.
  const actions = useMemo(() => {
    try {
      const a = generateActionsFromTemplate(templateId, fieldValues);
      return a.length > 0 ? a : null;
    } catch {
      return null;
    }
  }, [templateId, fieldValues]);

  // useSimulation auto-runs when `actions` is truthy. Gate by `triggered`
  // so the simulation only fires after the user explicitly clicks.
  const { result, isLoading, error, refetch } = useSimulation(
    triggered && actions ? actions : null,
  );

  const ready = !!actions && !disabled;

  const handleClick = () => {
    if (!ready) return;
    if (triggered) {
      refetch();
    } else {
      setTriggered(true);
    }
  };

  return (
    <div className={styles.wrapper}>
      <button
        type="button"
        className={styles.simulateBtn}
        onClick={handleClick}
        disabled={!ready}
        title={
          !ready
            ? 'Fill in the required fields to enable simulation'
            : 'Run the generated actions through Tenderly to verify they execute'
        }
      >
        {isLoading
          ? 'Simulating…'
          : triggered
            ? 'Re-simulate on Tenderly'
            : 'Simulate on Tenderly'}
      </button>

      {error && (
        <div className={styles.resultError}>
          Simulation request failed: {error.message}
        </div>
      )}

      {result && !error && (
        <div
          className={result.success ? styles.resultSuccess : styles.resultFail}
        >
          <div className={styles.resultHeader}>
            {result.success ? '✓ Simulation succeeded' : '✗ Simulation failed'}
          </div>
          <div className={styles.resultDetail}>
            {result.results.length} action{result.results.length === 1 ? '' : 's'}{' '}
            · {parseInt(result.totalGasUsed, 10).toLocaleString()} gas
          </div>
          {!result.success &&
            result.results.map((r, i) =>
              r.success ? null : (
                <div key={i} className={styles.actionError}>
                  Action #{i + 1}: {r.errorMessage || r.error || 'reverted'}
                </div>
              ),
            )}
          {result.shareUrl && (
            <a
              href={result.shareUrl}
              target="_blank"
              rel="noreferrer noopener"
              className={styles.shareLink}
            >
              View on Tenderly →
            </a>
          )}
        </div>
      )}
    </div>
  );
}
