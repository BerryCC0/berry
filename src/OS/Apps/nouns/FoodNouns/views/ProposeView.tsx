/**
 * Create a Food Nouns proposal.
 *
 * Multi-action authoring backed by the FN action registry — users stage
 * one or more typed actions (ETH transfer, auction admin setters, custom
 * call, …), preview each one's human-readable summary, and submit them all
 * to the V1 governor as parallel arrays.
 *
 * State model:
 *   stagedActions[]  — the actions that will be submitted, in display order
 *   description      — markdown body for the proposal
 *   editor           — { closed } | { add } | { edit, index } — single
 *                      inline editor at a time, open in either "new" or
 *                      "edit-existing" mode
 *
 * Encoding is centralised in `encodeStagedActions`, which throws a
 * user-readable error naming the offending action if any one of them is
 * invalid — caught here and surfaced inline above the submit button.
 */
'use client';

import { useEffect, useState } from 'react';
import { ActionEditor } from '../components/CreateProposal/ActionEditor';
import { TxStatusBanner } from '../components/TxStatusBanner';
import { useFNPropose } from '../hooks/useFNPropose';
import { useFNTreasuryBalance } from '../hooks/useFNTreasury';
import {
  encodeStagedActions,
  getActionDef,
  type StagedAction,
} from '../utils/proposalActions';
import { fmtEth } from '../utils/format';
import styles from './ProposeView.module.css';

interface Props {
  onBack: () => void;
  onCreated: (proposalId: bigint) => void;
  proposalThreshold: bigint;
  userVotes: bigint;
}

type EditorState =
  | { mode: 'closed' }
  | { mode: 'add' }
  | { mode: 'edit'; index: number };

export function ProposeView({
  onBack,
  onCreated,
  proposalThreshold,
  userVotes,
}: Props) {
  const propose = useFNPropose();
  const treasury = useFNTreasuryBalance();

  const [stagedActions, setStagedActions] = useState<StagedAction[]>([]);
  const [description, setDescription] = useState('');
  const [editor, setEditor] = useState<EditorState>({ mode: 'closed' });
  const [submitError, setSubmitError] = useState<string | null>(null);

  const insufficient =
    proposalThreshold > BigInt(0) && userVotes < proposalThreshold;
  const submitting = propose.isPending || propose.isConfirming;

  useEffect(() => {
    if (propose.isSuccess) {
      onBack();
      // The proposalId isn't available from a write tx (governor emits it
      // in an event we'd need to decode); for now the consumer of onCreated
      // can refetch the list. Keep the callback in the signature so a
      // future improvement can populate it.
      void onCreated;
    }
  }, [propose.isSuccess, onBack, onCreated]);

  // ---- staged-action mutations ------------------------------------------

  const addAction = (action: StagedAction) => {
    setStagedActions((prev) => [...prev, action]);
    setEditor({ mode: 'closed' });
    setSubmitError(null);
  };

  const updateAction = (index: number, action: StagedAction) => {
    setStagedActions((prev) =>
      prev.map((s, i) => (i === index ? action : s)),
    );
    setEditor({ mode: 'closed' });
    setSubmitError(null);
  };

  const removeAction = (index: number) => {
    setStagedActions((prev) => prev.filter((_, i) => i !== index));
    // If the editor was open on the removed item, close it.
    if (editor.mode === 'edit' && editor.index === index) {
      setEditor({ mode: 'closed' });
    }
    setSubmitError(null);
  };

  // ---- submit ------------------------------------------------------------

  const onSubmit = () => {
    setSubmitError(null);
    if (stagedActions.length === 0) {
      setSubmitError('Add at least one action before submitting.');
      return;
    }
    if (!description.trim()) {
      setSubmitError('Description is required.');
      return;
    }
    let encoded;
    try {
      encoded = encodeStagedActions(stagedActions);
    } catch (e) {
      setSubmitError(e instanceof Error ? e.message : 'Invalid action');
      return;
    }
    propose.propose({
      ...encoded,
      description,
    });
  };

  // ---- render ------------------------------------------------------------

  return (
    <div className={styles.container}>
      <button type="button" className={styles.backBtn} onClick={onBack}>
        ← Back
      </button>

      <div className={styles.header}>
        <h1 className={styles.title}>New Food Nouns proposal</h1>
        <p className={styles.subtitle}>
          Bundle one or more typed actions to be executed by the treasury if
          this proposal passes.
        </p>
      </div>

      <div className={styles.statRow}>
        <div className={styles.stat}>
          <span className={styles.statLabel}>Threshold</span>
          <span className={styles.statValue}>
            {proposalThreshold.toString()} votes
          </span>
        </div>
        <div className={styles.stat}>
          <span className={styles.statLabel}>Your votes</span>
          <span className={styles.statValue}>{userVotes.toString()}</span>
        </div>
        <div className={styles.stat}>
          <span className={styles.statLabel}>Treasury</span>
          <span className={styles.statValue}>Ξ {fmtEth(treasury.wei)}</span>
        </div>
      </div>

      {insufficient && (
        <div className={styles.warning}>
          You don&apos;t meet the proposal threshold. The transaction will
          revert if submitted.
        </div>
      )}

      {/* Actions section */}
      <section className={styles.section}>
        <div className={styles.sectionHeader}>
          <span className={styles.sectionTitle}>
            Actions ({stagedActions.length})
          </span>
          {editor.mode === 'closed' && (
            <button
              type="button"
              className={styles.addBtn}
              onClick={() => setEditor({ mode: 'add' })}
              disabled={submitting}
            >
              + Add action
            </button>
          )}
        </div>

        {stagedActions.length === 0 && editor.mode === 'closed' && (
          <div className={styles.emptyActions}>
            No actions yet. Click <strong>+ Add action</strong> to start —
            you can stage an ETH transfer, an auction-admin setter, or a
            custom call.
          </div>
        )}

        <div className={styles.stagedList}>
          {stagedActions.map((staged, i) => {
            const def = getActionDef(staged.defId);
            const isBeingEdited =
              editor.mode === 'edit' && editor.index === i;

            if (isBeingEdited) {
              return (
                <ActionEditor
                  key={`edit-${i}`}
                  initial={staged}
                  onCancel={() => setEditor({ mode: 'closed' })}
                  onSave={(next) => updateAction(i, next)}
                  disabled={submitting}
                />
              );
            }

            return (
              <div key={`row-${i}`} className={styles.stagedRow}>
                <div className={styles.stagedMain}>
                  <span className={styles.stagedIndex}>#{i + 1}</span>
                  <div className={styles.stagedText}>
                    <span className={styles.stagedName}>
                      {def?.name ?? 'Unknown action'}
                    </span>
                    <span className={styles.stagedDescribe}>
                      {def ? def.describe(staged.values) : '—'}
                    </span>
                  </div>
                </div>
                <div className={styles.stagedActions}>
                  <button
                    type="button"
                    className={styles.iconBtn}
                    onClick={() => setEditor({ mode: 'edit', index: i })}
                    disabled={submitting || editor.mode !== 'closed'}
                    title="Edit"
                  >
                    Edit
                  </button>
                  <button
                    type="button"
                    className={styles.iconBtnDanger}
                    onClick={() => removeAction(i)}
                    disabled={submitting}
                    title="Remove"
                  >
                    ✕
                  </button>
                </div>
              </div>
            );
          })}
        </div>

        {editor.mode === 'add' && (
          <ActionEditor
            onCancel={() => setEditor({ mode: 'closed' })}
            onSave={addAction}
            disabled={submitting}
          />
        )}
      </section>

      {/* Description */}
      <section className={styles.section}>
        <div className={styles.sectionHeader}>
          <span className={styles.sectionTitle}>Description</span>
        </div>
        <textarea
          className={styles.textarea}
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          rows={10}
          placeholder={'# Title\n\nWhat does this proposal do, and why?'}
          disabled={submitting}
        />
        <span className={styles.helpText}>
          The first line becomes the proposal title in lists.
        </span>
      </section>

      {submitError && <div className={styles.error}>{submitError}</div>}

      <div className={styles.submitRow}>
        <button
          type="button"
          className={styles.submitBtn}
          onClick={onSubmit}
          disabled={submitting}
        >
          {submitting ? 'Submitting…' : 'Submit proposal'}
        </button>
      </div>

      <TxStatusBanner
        hash={propose.hash ?? null}
        isPending={propose.isPending}
        isConfirming={propose.isConfirming}
        isSuccess={propose.isSuccess}
        error={propose.error}
        onDismiss={propose.reset}
        successMessage="Proposal submitted."
      />
    </div>
  );
}
