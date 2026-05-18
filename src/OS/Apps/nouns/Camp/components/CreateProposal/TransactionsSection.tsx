/**
 * TransactionsSection
 * Actions list with ActionTemplateEditor instances, add/remove buttons,
 * and a thin proposal-wide simulation status pill.
 */

import React, { useMemo } from 'react';
import { ActionTemplateEditor } from './ActionTemplateEditor';
import type { ActionTemplateState } from '../../utils/types';
import type { SimulationResult, TransactionResult } from '../../hooks/useSimulation';
import styles from './TransactionsSection.module.css';

interface TransactionsSectionProps {
  actionTemplateStates: ActionTemplateState[];
  onAddAction: () => void;
  onRemoveAction: (index: number) => void;
  onUpdateTemplateState: (index: number, newState: ActionTemplateState) => void;
  isCreating: boolean;
  simulationResult: SimulationResult | undefined;
  simulationIsLoading: boolean;
  simulationError: Error | null;
  simulationHasActions: boolean;
}

export function TransactionsSection({
  actionTemplateStates,
  onAddAction,
  onRemoveAction,
  onUpdateTemplateState,
  isCreating,
  simulationResult,
  simulationIsLoading,
  simulationError,
  simulationHasActions,
}: TransactionsSectionProps) {
  // simulationActions filters out empty-target actions, so result.results[i]
  // lines up with the i-th non-empty action across all templates. Walk both
  // arrays in lockstep to give each editor its own slice of sim results.
  const editorSimResults = useMemo(() => {
    let simIdx = 0;
    return actionTemplateStates.map((state) =>
      state.generatedActions.map((action) => {
        if (!action.target || action.target === '') return undefined;
        return simulationResult?.results?.[simIdx++];
      })
    );
  }, [actionTemplateStates, simulationResult]);

  return (
    <div className={styles.section}>
      <div className={styles.sectionHeader}>
        <label className={styles.label}>Transactions</label>
        <SimulationStatusPill
          isLoading={simulationIsLoading}
          error={simulationError}
          result={simulationResult}
          hasActions={simulationHasActions}
        />
      </div>

      {actionTemplateStates.map((templateState, index) => (
        <div key={index} className={styles.actionContainer}>
          {actionTemplateStates.length > 1 && (
            <button
              type="button"
              className={styles.removeActionButton}
              onClick={() => onRemoveAction(index)}
              disabled={isCreating}
              title="Remove this action"
            >
              ×
            </button>
          )}

          <ActionTemplateEditor
            index={index}
            templateState={templateState}
            onUpdateTemplateState={(newState) => onUpdateTemplateState(index, newState)}
            disabled={isCreating}
            simulationResults={editorSimResults[index]}
            shareUrl={simulationResult?.shareUrl}
          />
        </div>
      ))}

      <div className={styles.addButtonRow}>
        <button
          type="button"
          className={styles.addButton}
          onClick={onAddAction}
          disabled={isCreating}
        >
          + New Transaction
        </button>
      </div>
    </div>
  );
}

// ============================================================================
// SimulationStatusPill — thin proposal-wide status line
// ============================================================================

interface SimulationStatusPillProps {
  isLoading: boolean;
  error: Error | null;
  result: SimulationResult | undefined;
  hasActions: boolean;
}

function SimulationStatusPill({ isLoading, error, result, hasActions }: SimulationStatusPillProps) {
  if (!hasActions) return null;

  if (isLoading) {
    return (
      <div className={`${styles.simPill} ${styles.simPillLoading}`}>
        <span className={styles.simSpinner} aria-hidden />
        <span>Simulating…</span>
      </div>
    );
  }

  if (error) {
    return (
      <div className={`${styles.simPill} ${styles.simPillFail}`}>
        <span className={styles.simIcon}>✗</span>
        <span>Simulation failed: {error.message}</span>
      </div>
    );
  }

  if (!result) return null;

  const success = result.success;

  return (
    <div
      className={`${styles.simPill} ${success ? styles.simPillPass : styles.simPillFail}`}
    >
      <span className={styles.simIcon}>{success ? '✓' : '✗'}</span>
      <span className={styles.simText}>
        {success ? 'Simulation passed' : 'Some transactions failed'}
      </span>
      {result.shareUrl && (
        <a
          href={result.shareUrl}
          target="_blank"
          rel="noopener noreferrer"
          className={styles.simShareLink}
        >
          View on Tenderly →
        </a>
      )}
    </div>
  );
}

// re-export TransactionResult type for ActionTemplateEditor consumers
export type { TransactionResult };
