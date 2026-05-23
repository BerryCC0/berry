/**
 * ReturnTokensEditor
 *
 * Custom editor for `admin-fork-escrow-return-tokens`. The contract function
 * `returnTokensToOwner(address owner, uint256[] tokenIds)` takes exactly ONE
 * owner per call, so the editor is scoped to one (depositor, tokenIds[])
 * pair. Returning Nouns to multiple owners requires multiple proposal
 * actions, same as the legacy textbox UI.
 */

'use client';

import type { TemplateFieldValues } from '../../actionTemplates';
import { EscrowedNounsPicker } from './EscrowedNounsPicker';
import styles from './ForkEscrowEditors.module.css';

interface Props {
  fieldValues: TemplateFieldValues;
  onUpdateField: (field: string, value: string) => void;
  disabled?: boolean;
}

export function ReturnTokensEditor({
  fieldValues,
  onUpdateField,
  disabled,
}: Props) {
  return (
    <div className={styles.editor}>
      <EscrowedNounsPicker
        mode="by-owner"
        selectedOwner={fieldValues.owner ?? ''}
        selectedTokenIds={fieldValues.tokenIds ?? ''}
        onChange={({ owner, tokenIds }) => {
          onUpdateField('owner', owner);
          onUpdateField('tokenIds', tokenIds);
        }}
        disabled={disabled}
      />
      <p className={styles.fieldHint}>
        Returning Nouns to a different depositor requires a separate proposal
        action — the contract function takes one owner per call.
      </p>
    </div>
  );
}
