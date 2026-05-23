/**
 * Create a Food Nouns proposal: "send X ETH to Y address" + description.
 * Mirrors Camp's CreateProposal layout — flat sections, not nested labels.
 *
 * Builds a single V1 governor action where target=recipient, value=wei,
 * signature="" and calldata="0x" — the timelock forwards a plain ETH transfer.
 */

'use client';

import { useState, useEffect, useMemo } from 'react';
import { isAddress, parseEther, formatEther } from 'viem';
import { AddressInput } from '@/OS/Apps/nouns/Camp/components/CreateProposal/AddressInput';
import { TxStatusBanner } from '../components/TxStatusBanner';
import { useFNPropose } from '../hooks/useFNPropose';
import { useFNTreasuryBalance } from '../hooks/useFNTreasury';
import { fmtEth, truncateAddr } from '../utils/format';
import styles from './ProposeView.module.css';

interface Props {
  onBack: () => void;
  onCreated: (proposalId: bigint) => void;
  proposalThreshold: bigint;
  userVotes: bigint;
}

export function ProposeView({ onBack, onCreated, proposalThreshold, userVotes }: Props) {
  const propose = useFNPropose();
  const treasury = useFNTreasuryBalance();

  const [recipient, setRecipient] = useState('');
  const [amount, setAmount] = useState('');
  const [description, setDescription] = useState('');
  const [validationError, setValidationError] = useState<string | null>(null);

  const insufficient = proposalThreshold > BigInt(0) && userVotes < proposalThreshold;

  const amountWei = useMemo(() => {
    const trimmed = amount.trim();
    if (!trimmed) return null;
    try {
      return parseEther(trimmed as `${number}`);
    } catch {
      return null;
    }
  }, [amount]);

  const exceedsTreasury =
    amountWei !== null && treasury.wei > BigInt(0) && amountWei > treasury.wei;

  useEffect(() => {
    if (propose.isSuccess) {
      onBack();
      void onCreated;
    }
  }, [propose.isSuccess, onBack, onCreated]);

  const validateAndSubmit = () => {
    setValidationError(null);
    if (!recipient || !isAddress(recipient)) {
      setValidationError('Recipient must be a valid address (or resolved ENS name).');
      return;
    }
    if (amountWei === null) {
      setValidationError('Enter a valid ETH amount.');
      return;
    }
    if (amountWei <= BigInt(0)) {
      setValidationError('Amount must be greater than zero.');
      return;
    }
    if (!description.trim()) {
      setValidationError('Description is required.');
      return;
    }
    propose.propose({
      targets: [recipient as `0x${string}`],
      values: [amountWei],
      signatures: [''],
      calldatas: ['0x'],
      description,
    });
  };

  const submitting = propose.isPending || propose.isConfirming;

  return (
    <div className={styles.container}>
      <button type="button" className={styles.backBtn} onClick={onBack}>
        ← Back
      </button>

      <div className={styles.header}>
        <h1 className={styles.title}>New treasury proposal</h1>
        <p className={styles.subtitle}>
          Request a one-time ETH transfer from the Food Nouns treasury.
        </p>
      </div>

      <div className={styles.statRow}>
        <div className={styles.stat}>
          <span className={styles.statLabel}>Threshold</span>
          <span className={styles.statValue}>{proposalThreshold.toString()} votes</span>
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
          You don&apos;t meet the proposal threshold. The transaction will revert if submitted.
        </div>
      )}

      <div className={styles.form}>
        <div className={styles.section}>
          <span className={styles.label}>Recipient</span>
          <AddressInput
            value={recipient}
            onChange={setRecipient}
            placeholder="0x… or name.eth"
            disabled={submitting}
            helpText="Where the ETH goes if this proposal passes"
          />
        </div>

        <div className={styles.section}>
          <span className={styles.label}>Amount (ETH)</span>
          <input
            type="number"
            min="0"
            step="0.0001"
            inputMode="decimal"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            placeholder="0.0"
            disabled={submitting}
            className={styles.input}
          />
          {exceedsTreasury && (
            <span className={styles.amountWarn}>
              Exceeds current treasury balance (Ξ {fmtEth(treasury.wei)}).
            </span>
          )}
        </div>

        <div className={styles.section}>
          <span className={styles.label}>Description (markdown)</span>
          <textarea
            className={styles.textarea}
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            rows={10}
            placeholder={'# Title\n\nWhat is this funding? Why?'}
            disabled={submitting}
          />
          <span className={styles.helpText}>
            The first line becomes the proposal title in lists.
          </span>
        </div>

        <div className={styles.summary}>
          <span className={styles.summaryTitle}>Summary</span>
          {recipient && isAddress(recipient) && amountWei !== null && amountWei > BigInt(0) ? (
            <p className={styles.summaryText}>
              Send <strong>Ξ {formatEther(amountWei)}</strong> from the treasury to{' '}
              <code className={styles.summaryAddr}>{truncateAddr(recipient)}</code>.
            </p>
          ) : (
            <p className={styles.summaryEmpty}>
              Fill in a recipient and amount to preview the action.
            </p>
          )}
        </div>

        {validationError && <div className={styles.error}>{validationError}</div>}

        <div className={styles.submitRow}>
          <button
            type="button"
            className={styles.submitBtn}
            onClick={validateAndSubmit}
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
    </div>
  );
}
