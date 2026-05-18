/**
 * ActionTemplateEditor
 * Per-action summary card in the Transactions column. Renders the chosen
 * template's name + a 1-line decoded summary + an Edit button. Picking and
 * parameter editing happen inside ActionEditorModal, which this component
 * mounts on demand. A collapsible "Transactions" details strip surfaces
 * the full decoded action list + per-action simulation results below the
 * summary.
 */

'use client';

import React, { useState } from 'react';
import { ACTION_TEMPLATES } from '../../utils/actionTemplates';
import type { ActionTemplateType } from '../../utils/actionTemplates';
import type { ActionTemplateState } from '../../utils/types';
import { useDecodedTransactions } from '../../hooks/useDecodedTransactions';
import { ActionEditorModal } from './ActionEditorModal';
import {
  AddressWithENS,
  formatGas,
  getTenderlySimulatorUrl,
} from '../SimulationStatus/SimulationStatus';
import type { TransactionResult } from '../../hooks/useSimulation';
import styles from './ActionTemplateEditor.module.css';

interface ActionTemplateEditorProps {
  index: number;
  templateState: ActionTemplateState;
  onUpdateTemplateState: (state: ActionTemplateState) => void;
  disabled?: boolean;
  /**
   * Per-action simulation results aligned with `generatedActions`. Entries are
   * `undefined` for actions skipped from simulation (empty target) or when no
   * simulation has run yet.
   */
  simulationResults?: Array<TransactionResult | undefined>;
  /**
   * Proposal-wide Tenderly share URL. When present, per-row Tenderly links
   * are suppressed (the share link in the bottom pill covers everything).
   */
  shareUrl?: string;
}

export function ActionTemplateEditor({
  index,
  templateState,
  onUpdateTemplateState,
  disabled = false,
  simulationResults,
  shareUrl,
}: ActionTemplateEditorProps) {
  const [isModalOpen, setIsModalOpen] = useState(false);

  const template =
    templateState.templateId && templateState.templateId !== 'custom'
      ? ACTION_TEMPLATES[templateState.templateId as ActionTemplateType]
      : null;

  const isCustom = templateState.templateId === 'custom';
  const isConfigured = !!templateState.templateId;

  // First decoded title gives us a one-line human-readable summary.
  const decoded = useDecodedTransactions(templateState.generatedActions);
  const primarySummary = decoded[0]?.title || null;
  const extraCount = decoded.length > 1 ? decoded.length - 1 : 0;

  const handleSave = (newState: ActionTemplateState) => {
    onUpdateTemplateState(newState);
    setIsModalOpen(false);
  };

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <span className={styles.actionLabel}>Transaction {index + 1}</span>
      </div>

      {isConfigured ? (
        <div className={styles.summary}>
          <div className={styles.summaryMain}>
            <div className={styles.summaryTitle}>
              {isCustom ? 'Custom Transaction' : template?.name || 'Action'}
            </div>
            {primarySummary && (
              <div className={styles.summaryDetail}>
                {primarySummary}
                {extraCount > 0 && (
                  <span className={styles.summaryExtra}>
                    {' '}
                    + {extraCount} more
                  </span>
                )}
              </div>
            )}
          </div>
          <button
            type="button"
            className={styles.editButton}
            onClick={() => setIsModalOpen(true)}
            disabled={disabled}
          >
            Edit
          </button>
        </div>
      ) : (
        <div className={styles.emptyState}>
          <div className={styles.emptyText}>Not configured yet</div>
          <button
            type="button"
            className={styles.configureButton}
            onClick={() => setIsModalOpen(true)}
            disabled={disabled}
          >
            Configure transaction
          </button>
        </div>
      )}

      {/* Decoded summary + per-action simulation results */}
      {isConfigured && templateState.generatedActions.length > 0 && (
        <DecodedActionsPreview
          actions={templateState.generatedActions}
          simulationResults={simulationResults}
          shareUrl={shareUrl}
        />
      )}

      {isModalOpen && (
        <ActionEditorModal
          initialState={templateState}
          onSave={handleSave}
          onClose={() => setIsModalOpen(false)}
          disabled={disabled}
        />
      )}
    </div>
  );
}

// ============================================================================
// DecodedActionsPreview — human-readable summary + per-action sim results
// ============================================================================

interface ProposalAction {
  target: string;
  value: string;
  signature: string;
  calldata: string;
}

interface DecodedActionsPreviewProps {
  actions: ProposalAction[];
  simulationResults?: Array<TransactionResult | undefined>;
  shareUrl?: string;
}

function DecodedActionsPreview({
  actions,
  simulationResults,
  shareUrl,
}: DecodedActionsPreviewProps) {
  const decoded = useDecodedTransactions(actions);

  // Aggregate sim state for the collapsed summary so users can see overall
  // pass/fail at a glance without expanding.
  const resultsWithData = simulationResults?.filter((r) => r !== undefined) ?? [];
  const hasAnyResult = resultsWithData.length > 0;
  const allPassed = hasAnyResult && resultsWithData.every((r) => r!.success);
  const anyFailed = hasAnyResult && resultsWithData.some((r) => !r!.success);

  return (
    <details className={styles.decodedPreview}>
      <summary className={styles.decodedHeader}>
        <span className={styles.decodedHeaderCaret} aria-hidden>▶</span>
        <span>Transactions</span>
        {decoded.length > 1 && (
          <span className={styles.decodedHeaderCount}>· {decoded.length}</span>
        )}
        {anyFailed && (
          <span className={`${styles.decodedHeaderStatus} ${styles.decodedStatusFail}`}>✗</span>
        )}
        {!anyFailed && allPassed && (
          <span className={`${styles.decodedHeaderStatus} ${styles.decodedStatusPass}`}>✓</span>
        )}
      </summary>
      <ol className={styles.decodedList}>
        {decoded.map((d, idx) => {
          const dest = d.params?.to || d.params?.contract;
          const isContract = !!d.params?.contract;
          const action = actions[idx];
          const simResult = simulationResults?.[idx];
          const hasResult = simResult !== undefined;
          const gas = hasResult ? parseInt(simResult.gasUsed, 10) : 0;

          let statusClass = styles.decodedStatusNeutral;
          let statusIcon = '–';
          if (hasResult && simResult.success) {
            statusClass = styles.decodedStatusPass;
            statusIcon = '✓';
          } else if (hasResult && !simResult.success) {
            statusClass = styles.decodedStatusFail;
            statusIcon = '✗';
          }

          const tenderlyLink = !shareUrl && action ? getTenderlySimulatorUrl(action) : null;
          const showFooter = tenderlyLink !== null || hasResult;

          return (
            <li key={idx} className={styles.decodedItem}>
              <div className={styles.decodedTitleRow}>
                <span className={styles.decodedTitle}>{d.title}</span>
              </div>
              {d.description && <div className={styles.decodedDesc}>{d.description}</div>}
              {dest && (
                <div className={styles.decodedDest}>
                  <span className={styles.decodedDestLabel}>
                    {isContract ? 'Contract' : 'To'}:
                  </span>{' '}
                  <AddressWithENS address={dest} className={styles.decodedAddr} />
                </div>
              )}
              {hasResult && !simResult.success && (
                <div className={styles.decodedError}>
                  {simResult.errorMessage || simResult.error || 'Transaction failed'}
                </div>
              )}
              {showFooter && (
                <div className={styles.decodedFooter}>
                  {tenderlyLink ? (
                    <a
                      href={tenderlyLink}
                      target="_blank"
                      rel="noopener noreferrer"
                      className={styles.decodedTenderly}
                    >
                      Verify on Tenderly →
                    </a>
                  ) : (
                    <span />
                  )}
                  {hasResult && (
                    <span className={styles.decodedSimStatus}>
                      {gas > 0 && (
                        <span className={styles.decodedGas}>{formatGas(simResult.gasUsed)} gas</span>
                      )}
                      <span className={`${styles.decodedStatus} ${statusClass}`}>{statusIcon}</span>
                    </span>
                  )}
                </div>
              )}
            </li>
          );
        })}
      </ol>
      <details className={styles.rawDetails}>
        <summary className={styles.rawSummary}>Show raw calldata</summary>
        {actions.map((action, idx) => (
          <div key={idx} className={styles.generatedAction}>
            {actions.length > 1 && (
              <div className={styles.actionNumber}>Transaction {idx + 1}</div>
            )}
            <div className={styles.generatedField}>
              <span className={styles.generatedLabel}>Target:</span>
              <code className={styles.generatedValue}>{action.target}</code>
            </div>
            <div className={styles.generatedField}>
              <span className={styles.generatedLabel}>Value:</span>
              <code className={styles.generatedValue}>{action.value}</code>
            </div>
            <div className={styles.generatedField}>
              <span className={styles.generatedLabel}>Signature:</span>
              <code className={styles.generatedValue}>{action.signature}</code>
            </div>
            <div className={styles.generatedField}>
              <span className={styles.generatedLabel}>Calldata:</span>
              <code className={styles.generatedValueLong}>{action.calldata}</code>
            </div>
          </div>
        ))}
      </details>
    </details>
  );
}
