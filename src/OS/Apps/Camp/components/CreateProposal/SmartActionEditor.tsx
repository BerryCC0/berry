/**
 * SmartActionEditor Component
 * Raw action editor for custom transactions
 */

'use client';

import React from 'react';
import styles from './SmartActionEditor.module.css';

interface SmartActionEditorProps {
  index: number;
  target: string;
  value: string;
  signature: string;
  calldata: string;
  onUpdate: (field: 'target' | 'value' | 'signature' | 'calldata', value: string) => void;
  disabled?: boolean;
}

export function SmartActionEditor({
  index,
  target,
  value,
  signature,
  calldata,
  onUpdate,
  disabled = false,
}: SmartActionEditorProps) {
  return (
    <div className={styles.container}>
      <div className={styles.inputGroup}>
        <label className={styles.label}>
          Target Contract Address
          <span className={styles.required}>*</span>
        </label>
        <input
          type="text"
          className={styles.input}
          value={target}
          onChange={(e) => onUpdate('target', e.target.value)}
          placeholder="0x..."
          disabled={disabled}
        />
        <div className={styles.helpText}>
          The contract address that will be called
        </div>
      </div>

      <div className={styles.inputGroup}>
        <label className={styles.label}>
          ETH Value (wei)
        </label>
        <input
          type="text"
          className={styles.input}
          value={value}
          onChange={(e) => onUpdate('value', e.target.value)}
          placeholder="0"
          disabled={disabled}
        />
        <div className={styles.helpText}>
          Amount of ETH to send with this call (in wei, 0 for no ETH)
        </div>
      </div>

      <div className={styles.inputGroup}>
        <label className={styles.label}>
          Function Signature
        </label>
        <input
          type="text"
          className={styles.input}
          value={signature}
          onChange={(e) => onUpdate('signature', e.target.value)}
          placeholder="transfer(address,uint256)"
          disabled={disabled}
        />
        <div className={styles.helpText}>
          The function to call, e.g., &quot;transfer(address,uint256)&quot;
        </div>
      </div>

      <div className={styles.inputGroup}>
        <label className={styles.label}>
          Calldata
        </label>
        <textarea
          className={styles.textarea}
          value={calldata}
          onChange={(e) => onUpdate('calldata', e.target.value)}
          placeholder="0x..."
          disabled={disabled}
          rows={3}
        />
        <div className={styles.helpText}>
          ABI-encoded function arguments (hex string starting with 0x)
        </div>
      </div>
    </div>
  );
}

