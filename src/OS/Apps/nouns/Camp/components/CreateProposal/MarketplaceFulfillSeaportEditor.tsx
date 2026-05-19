/**
 * MarketplaceFulfillSeaportEditor
 * Power-user fallback editor for the `marketplace-fulfill-seaport`
 * template. Use this when:
 *   - The OpenSea API can't surface the listing (private reserve
 *     listings sometimes won't appear in public listings endpoints)
 *   - You're using an advanced fulfillment (fulfillOrder, advancedOrder,
 *     bundles) that the auto-encoder doesn't support
 *   - You generated the calldata via the Seaport JS SDK directly
 *
 * The proposer pastes the Seaport contract address, the ETH value, and
 * the pre-built calldata. We store them as-is and emit a single proposal
 * action.
 */

'use client';

import type { TemplateFieldValues } from '../../utils/actionTemplates';
import { SEAPORT_ADDRESS } from '../../utils/actionTemplates/constants';
import editorStyles from './ActionTemplateEditor.module.css';

interface MarketplaceFulfillSeaportEditorProps {
  fieldValues: TemplateFieldValues;
  onUpdateField: (field: string, value: string) => void;
  disabled?: boolean;
}

// Seaport 1.5 / 1.6 mainnet — same address on both versions.
const SEAPORT_DEFAULT = SEAPORT_ADDRESS;

export function MarketplaceFulfillSeaportEditor({
  fieldValues,
  onUpdateField,
  disabled = false,
}: MarketplaceFulfillSeaportEditorProps) {
  const calldata = fieldValues.calldata || '';
  const value = fieldValues.value || '';
  const to = fieldValues.to || SEAPORT_DEFAULT;

  const calldataLooksValid = /^0x[0-9a-fA-F]+$/.test(calldata) && calldata.length >= 10;

  return (
    <div className={editorStyles.templateForm}>
      <div className={editorStyles.inputGroup}>
        <label className={editorStyles.label}>
          Seaport Contract Address <span className={editorStyles.required}>*</span>
        </label>
        <input
          type="text"
          className={editorStyles.input}
          value={to}
          onChange={(e) => onUpdateField('to', e.target.value)}
          placeholder={SEAPORT_DEFAULT}
          disabled={disabled}
        />
        <div className={editorStyles.helpText}>
          Defaults to the standard Seaport 1.5 / 1.6 address on mainnet. Only
          change if you&apos;re fulfilling against an alternate deployment.
        </div>
      </div>

      <div className={editorStyles.inputGroup}>
        <label className={editorStyles.label}>
          ETH Value (wei) <span className={editorStyles.required}>*</span>
        </label>
        <input
          type="text"
          inputMode="numeric"
          className={editorStyles.input}
          value={value}
          onChange={(e) => onUpdateField('value', e.target.value)}
          placeholder="100000000000000000"
          disabled={disabled}
        />
        <div className={editorStyles.helpText}>
          Amount of ETH the treasury sends with the call, in wei (1 ETH = 1e18 wei).
          For ETH-denominated orders this is the listing price; for ERC-20-denominated
          orders this is 0.
        </div>
      </div>

      <div className={editorStyles.inputGroup}>
        <label className={editorStyles.label}>
          Calldata <span className={editorStyles.required}>*</span>
        </label>
        <textarea
          className={editorStyles.textarea}
          value={calldata}
          onChange={(e) => onUpdateField('calldata', e.target.value.trim())}
          placeholder="0x..."
          disabled={disabled}
          rows={6}
          spellCheck={false}
          style={{ fontFamily: 'var(--berry-font-mono)', fontSize: '11px' }}
        />
        <div className={editorStyles.helpText}>
          Pre-built calldata for the Seaport function you&apos;re invoking
          (e.g. <code>fulfillBasicOrder</code>, <code>fulfillOrder</code>,
          <code>fulfillAdvancedOrder</code>). Generate via the{' '}
          <a
            href="https://github.com/ProjectOpenSea/seaport-js"
            target="_blank"
            rel="noopener noreferrer"
          >
            Seaport JS SDK
          </a>{' '}
          or OpenSea&apos;s fulfillment_data API.
        </div>
        {calldata && !calldataLooksValid && (
          <div className={editorStyles.error}>
            Calldata must be a 0x-prefixed hex string with at least a 4-byte
            function selector.
          </div>
        )}
      </div>
    </div>
  );
}
