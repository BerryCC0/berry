/**
 * TransactionsSection
 * Actions list with ActionTemplateEditor instances, add/remove buttons, and simulation status
 */

import React from 'react';
import { ActionTemplateEditor } from './ActionTemplateEditor';
import { SimulationStatus } from '../SimulationStatus';
import type { ActionTemplateState } from '../../utils/types';
import type { SimulationResult } from '../../hooks/useSimulation';
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
  simulationActions: Array<{
    target: string;
    value: string;
    signature: string;
    calldata: string;
  }> | undefined;
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
  simulationActions,
}: TransactionsSectionProps) {
  return (
    <div className={styles.section}>
      <label className={styles.label}>Transactions</label>

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

      {/* Simulation Status */}
      <SimulationStatus
        result={simulationResult}
        isLoading={simulationIsLoading}
        error={simulationError}
        hasActions={simulationHasActions}
        actions={simulationActions}
      />
    </div>
  );
}
