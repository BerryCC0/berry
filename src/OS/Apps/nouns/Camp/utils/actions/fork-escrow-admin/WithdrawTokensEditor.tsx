/**
 * WithdrawTokensEditor
 *
 * Custom editor for `admin-fork-escrow-withdraw-tokens`. The action calls
 * the Governor's admin-gated withdraw wrapper — NOT the ForkEscrow contract
 * directly. See the action def for the full reasoning.
 *
 * Precondition the proposer needs to understand: the escrowed Nouns must
 * already be DAO-owned inside the ForkEscrow (which happens automatically
 * when `executeFork` runs after a successful fork). A DAO proposal cannot
 * close the escrow itself — that's only triggered by `executeFork`, which
 * is permissionless but requires the fork threshold to have been met.
 */

'use client';

import type { TemplateFieldValues } from '../../actionTemplates';
import { AddressInput } from '../../../components/CreateProposal/AddressInput';
import { EscrowedNounsPicker } from './EscrowedNounsPicker';
import styles from './ForkEscrowEditors.module.css';

interface Props {
  fieldValues: TemplateFieldValues;
  onUpdateField: (field: string, value: string) => void;
  disabled?: boolean;
}

export function WithdrawTokensEditor({
  fieldValues,
  onUpdateField,
  disabled,
}: Props) {
  return (
    <div className={styles.editor}>
      <div className={styles.fieldGroup}>
        <label className={styles.fieldLabel}>Nouns to withdraw</label>
        <EscrowedNounsPicker
          mode="flat"
          selectedTokenIds={fieldValues.tokenIds ?? ''}
          onChange={(next) => onUpdateField('tokenIds', next)}
          disabled={disabled}
        />
        <p className={styles.fieldHint}>
          Calls the Governor&apos;s{' '}
          <code>withdrawDAONounsFromEscrowToTreasury</code> (when recipient is
          the treasury) or{' '}
          <code>withdrawDAONounsFromEscrowIncreasingTotalSupply</code>{' '}
          (otherwise). Requires the Nouns to already be DAO-owned in the
          escrow — i.e., a fork was executed (via the permissionless{' '}
          <code>executeFork</code>) and closed the escrow automatically. A
          DAO proposal cannot close the escrow itself.
        </p>
      </div>
      <div className={styles.fieldGroup}>
        <label className={styles.fieldLabel}>Recipient</label>
        <AddressInput
          value={fieldValues.recipient ?? ''}
          onChange={(value) => onUpdateField('recipient', value)}
          placeholder="0x… or name.eth"
          disabled={disabled}
          helpText="Treasury → cheaper, no supply event. Any other address → emits DAONounsSupplyIncreasedFromEscrow."
        />
      </div>
    </div>
  );
}
