'use client';

/**
 * PredictedStreamAddress
 *
 * Read-only field that derives the deterministic CREATE2 address a new
 * stream contract will be deployed at, using sibling form fields:
 *   - recipient
 *   - tokenAddress  (may be a raw 0x address or a JSON {address, decimals})
 *   - amount        (parsed against the token's decimals)
 *   - startDate     (Date string, converted to unix seconds)
 *   - endDate       (Date string, converted to unix seconds)
 *
 * Whenever the predicted address resolves and differs from the current value,
 * we propagate it up via onChange so the generator's calldata encodes the
 * matching predictedStreamAddress — otherwise StreamFactory reverts with
 * `UnexpectedStreamAddress`.
 *
 * Until enough fields are filled, the hook stays disabled and we render a
 * placeholder explaining what's missing.
 */

import { useEffect, useMemo } from 'react';
import { parseUnits } from 'viem';
import { usePredictStreamAddress } from '../../hooks/usePredictStreamAddress';
import { COMMON_TOKENS } from '../../utils/actionTemplates/constants';
import type { TemplateFieldValues } from '../../utils/actionTemplates';
import styles from './PredictedStreamAddress.module.css';

interface PredictedStreamAddressProps {
  value: string;
  onChange: (value: string) => void;
  /** Sibling field values; supplied by the editor. */
  fieldValues: TemplateFieldValues;
  /** Optional field name overrides — defaults match the payment-stream template. */
  tokenFieldName?: string;
  recipientFieldName?: string;
  amountFieldName?: string;
  startFieldName?: string;
  endFieldName?: string;
}

/**
 * Pull out token address and decimals from a field that may hold either a
 * raw 0x address or a JSON-stringified `{address, decimals}` payload
 * (the two shapes our existing token pickers produce).
 */
function resolveToken(raw: string | undefined): {
  address: `0x${string}` | undefined;
  decimals: number;
} {
  if (!raw) return { address: undefined, decimals: 18 };

  // Raw 0x address
  if (raw.startsWith('0x') && raw.length === 42) {
    const match = COMMON_TOKENS.find(
      (t) => t.address.toLowerCase() === raw.toLowerCase(),
    );
    return {
      address: raw as `0x${string}`,
      decimals: match?.decimals ?? 18,
    };
  }

  // JSON shape
  try {
    const parsed = JSON.parse(raw);
    if (parsed && typeof parsed.address === 'string') {
      const decimals =
        typeof parsed.decimals === 'number' ? parsed.decimals : 18;
      return {
        address: parsed.address as `0x${string}`,
        decimals,
      };
    }
  } catch {
    /* fall through */
  }

  return { address: undefined, decimals: 18 };
}

function unixFromDateString(dateStr: string | undefined): bigint | undefined {
  if (!dateStr) return undefined;
  const ms = new Date(dateStr).getTime();
  if (!Number.isFinite(ms)) return undefined;
  return BigInt(Math.floor(ms / 1000));
}

export function PredictedStreamAddress({
  value,
  onChange,
  fieldValues,
  tokenFieldName = 'tokenAddress',
  recipientFieldName = 'recipient',
  amountFieldName = 'amount',
  startFieldName = 'startDate',
  endFieldName = 'endDate',
}: PredictedStreamAddressProps) {
  const recipient = fieldValues[recipientFieldName];
  const token = useMemo(
    () => resolveToken(fieldValues[tokenFieldName]),
    [fieldValues, tokenFieldName],
  );

  const tokenAmount = useMemo(() => {
    const amountStr = fieldValues[amountFieldName];
    if (!amountStr) return undefined;
    try {
      return parseUnits(amountStr, token.decimals);
    } catch {
      return undefined;
    }
  }, [fieldValues, amountFieldName, token.decimals]);

  const startTime = useMemo(
    () => unixFromDateString(fieldValues[startFieldName]),
    [fieldValues, startFieldName],
  );
  const stopTime = useMemo(
    () => unixFromDateString(fieldValues[endFieldName]),
    [fieldValues, endFieldName],
  );

  const { address: predictedAddress, isLoading, error } = usePredictStreamAddress({
    recipient,
    tokenAddress: token.address,
    tokenAmount,
    startTime,
    stopTime,
  });

  // Propagate the computed address back to fieldValues. Skip while loading
  // so stale data never gets written; only write when the value actually
  // differs from what's already stored to avoid render loops.
  useEffect(() => {
    if (isLoading) return;
    if (predictedAddress && predictedAddress !== value) {
      onChange(predictedAddress);
    }
  }, [predictedAddress, value, onChange, isLoading]);

  const missing: string[] = [];
  if (!token.address) missing.push('token');
  if (!recipient || !recipient.startsWith('0x')) missing.push('recipient');
  if (!tokenAmount || tokenAmount === BigInt(0)) missing.push('amount');
  if (!startTime) missing.push('start date');
  if (!stopTime) missing.push('end date');
  if (startTime && stopTime && stopTime <= startTime) {
    missing.push('end date later than start');
  }

  if (missing.length > 0) {
    return (
      <div className={styles.placeholder}>
        Auto-computed once you fill in: {missing.join(', ')}.
      </div>
    );
  }

  if (isLoading) {
    return <div className={styles.placeholder}>Computing predicted address…</div>;
  }

  if (error) {
    return (
      <div className={styles.error}>
        Couldn’t compute the address (RPC error). Check the StreamFactory ABI /
        RPC connection.
      </div>
    );
  }

  if (!predictedAddress) {
    return <div className={styles.placeholder}>—</div>;
  }

  return (
    <div className={styles.container}>
      <code className={styles.address}>{predictedAddress}</code>
      <div className={styles.note}>
        Auto-computed CREATE2 address — the new stream contract will be
        deployed here when the proposal executes.
      </div>
    </div>
  );
}
