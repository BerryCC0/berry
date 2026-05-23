/**
 * OpenSeaCollectionOfferEditor
 *
 * Structured editor for `opensea-collection-offer`. Collects high-level
 * inputs (collection, WETH amount, expiration) and updates the action's
 * `order` field with a freshly-built Order JSON.
 *
 * Quick-pick chip for the Nouns collection — the most common buyback target.
 *
 * Caveat: this builds the on-chain authorization correctly, but the order
 * won't appear in OpenSea's UI until someone POSTs the order body to
 * OpenSea's `orders/v2/post` endpoint. That happens out-of-band today;
 * automating it via a follow-up server route is a later phase.
 */

'use client';

import { useEffect, useMemo } from 'react';
import { isAddress, parseUnits, type Address } from 'viem';
import { NOUNS_ADDRESSES } from '@/app/lib/nouns';
import type { TemplateFieldValues, TokenInfo } from '../../actionTemplates';
import { COMMON_TOKENS } from '../../actionTemplates/constants';
import { AddressInput } from '../../../components/CreateProposal/AddressInput';
import { formatTokenAmount } from '../shared';
import { buildCollectionOfferJson } from './_order-builder';
import styles from './OpenSeaCollectionOfferEditor.module.css';

interface Props {
  fieldValues: TemplateFieldValues;
  onUpdateField: (field: string, value: string) => void;
  disabled?: boolean;
}

const WETH = COMMON_TOKENS.find((t: TokenInfo) => t.symbol === 'WETH')!.address;
const NOUNS_TOKEN = NOUNS_ADDRESSES.token as Address;
const TREASURY = NOUNS_ADDRESSES.treasury as Address;

/** Duration presets shown as quick-pick chips. */
const DURATION_PRESETS: Array<{ label: string; days: number }> = [
  { label: '1 day', days: 1 },
  { label: '7 days', days: 7 },
  { label: '30 days', days: 30 },
];

/** OpenSea fee in basis points (mirrors _seaport.ts). */
const FEE_BPS = 50;

export function OpenSeaCollectionOfferEditor({
  fieldValues,
  onUpdateField,
  disabled,
}: Props) {
  // Field reads — all values arrive as strings.
  const collection = (fieldValues.collection ?? NOUNS_TOKEN) as Address;
  const netAmountInput = fieldValues.netAmount ?? '';
  const durationDaysStr = fieldValues.durationDays ?? '7';
  const durationDays = Number(durationDaysStr) || 7;
  // The stored absolute end timestamp — preserved across re-renders so the
  // builder produces deterministic output until the user changes the duration.
  const endTimeStored = fieldValues.endTime ?? '';

  // Parse the net amount (WETH, 18 decimals).
  const netAmountWei = useMemo(() => {
    if (!netAmountInput) return BigInt(0);
    try {
      return parseUnits(netAmountInput, 18);
    } catch {
      return BigInt(0);
    }
  }, [netAmountInput]);

  const feeWei = (netAmountWei * BigInt(FEE_BPS)) / BigInt(10_000);
  const totalCostWei = netAmountWei + feeWei;

  // Compute / refresh endTime when the duration changes or it's never been set.
  useEffect(() => {
    const nowSec = Math.floor(Date.now() / 1000);
    const desiredEnd = nowSec + durationDays * 86_400;
    if (!endTimeStored) {
      onUpdateField('endTime', String(desiredEnd));
      return;
    }
    const stored = Number(endTimeStored);
    // If the stored end is more than 2 days off from "now + durationDays",
    // refresh it. This catches the case where the user reopens a stale draft.
    if (Math.abs(stored - desiredEnd) > 2 * 86_400) {
      onUpdateField('endTime', String(desiredEnd));
    }
  }, [durationDays, endTimeStored, onUpdateField]);

  // Build the Order JSON from the current inputs whenever any of them change.
  useEffect(() => {
    if (!isAddress(collection)) return;
    if (netAmountWei <= BigInt(0)) return;
    if (!endTimeStored) return;

    const orderJson = buildCollectionOfferJson({
      offerer: TREASURY,
      collection,
      currency: WETH as Address,
      netAmount: netAmountWei,
      startTime: BigInt(0), // valid immediately
      endTime: BigInt(endTimeStored),
    });
    if (orderJson !== fieldValues.order) {
      onUpdateField('order', orderJson);
    }
  }, [
    collection,
    netAmountWei,
    endTimeStored,
    fieldValues.order,
    onUpdateField,
  ]);

  const expirationDisplay = useMemo(() => {
    if (!endTimeStored) return '';
    const nowSec = Math.floor(Date.now() / 1000);
    const stored = Number(endTimeStored);
    const remaining = stored - nowSec;
    if (remaining <= 0) {
      return 'Expired — adjust duration to refresh';
    }
    const date = new Date(stored * 1000);
    return `Expires ${date.toLocaleString()}`;
  }, [endTimeStored]);

  const isExpired =
    endTimeStored &&
    Number(endTimeStored) <= Math.floor(Date.now() / 1000);

  return (
    <div className={styles.editor}>
      {/* Collection picker — quick-pick + raw address input */}
      <div className={styles.fieldGroup}>
        <label className={styles.fieldLabel}>Collection</label>
        <div className={styles.quickPickRow}>
          <button
            type="button"
            className={`${styles.quickPickChip} ${
              collection.toLowerCase() === NOUNS_TOKEN.toLowerCase()
                ? styles.active
                : ''
            }`}
            onClick={() => onUpdateField('collection', NOUNS_TOKEN)}
            disabled={disabled}
          >
            Nouns (treasury buyback)
          </button>
        </div>
        <AddressInput
          value={collection}
          onChange={(value) => onUpdateField('collection', value)}
          placeholder="0x… NFT collection address"
          disabled={disabled}
          helpText="Any ERC-721 collection. Defaults to Nouns for treasury buybacks."
        />
      </div>

      {/* Net offer amount */}
      <div className={styles.fieldGroup}>
        <label className={styles.fieldLabel}>Offer Amount (WETH)</label>
        <input
          type="text"
          inputMode="decimal"
          className={styles.fieldInput}
          value={netAmountInput}
          onChange={(e) => onUpdateField('netAmount', e.target.value)}
          placeholder="1.0"
          disabled={disabled}
        />
        <p className={styles.fieldHint}>
          The seller receives this amount; the OpenSea fee is added on top.
        </p>
      </div>

      {/* Duration presets */}
      <div className={styles.fieldGroup}>
        <label className={styles.fieldLabel}>Offer Duration</label>
        <div className={styles.durationRow}>
          {DURATION_PRESETS.map((preset) => (
            <button
              key={preset.days}
              type="button"
              className={`${styles.durationChip} ${
                durationDays === preset.days ? styles.active : ''
              }`}
              onClick={() => {
                onUpdateField('durationDays', String(preset.days));
                // Force endTime refresh by clearing so the effect recomputes.
                onUpdateField('endTime', '');
              }}
              disabled={disabled}
            >
              {preset.label}
            </button>
          ))}
        </div>
        {expirationDisplay && (
          <p
            className={`${styles.expirationLine} ${isExpired ? styles.expirationWarning : ''}`}
          >
            {expirationDisplay}
          </p>
        )}
      </div>

      {/* Fee preview */}
      {netAmountWei > BigInt(0) && (
        <div className={styles.feePreview}>
          <div className={styles.feeRow}>
            <span className={styles.feeLabel}>Offer (to seller)</span>
            <span className={styles.feeValue}>
              {formatTokenAmount(netAmountWei, 18)} WETH
            </span>
          </div>
          <div className={styles.feeRow}>
            <span className={styles.feeLabel}>
              OpenSea fee ({FEE_BPS / 100}%)
            </span>
            <span className={styles.feeValue}>
              {formatTokenAmount(feeWei, 18)} WETH
            </span>
          </div>
          <div className={`${styles.feeRow} ${styles.feeTotal}`}>
            <span className={styles.feeLabel}>Total locked from treasury</span>
            <span className={styles.feeValue}>
              {formatTokenAmount(totalCostWei, 18)} WETH
            </span>
          </div>
        </div>
      )}

      <p className={styles.fieldHint}>
        The proposal calls <code>WETH.approve(OpenSeaConduit, total)</code> and{' '}
        <code>Seaport.validate(order)</code>. Until someone POSTs the order
        body to OpenSea&apos;s API after execution, the bid is authorised
        on-chain but won&apos;t appear in OpenSea&apos;s UI.
      </p>
    </div>
  );
}
