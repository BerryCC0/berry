'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { formatEther, formatUnits } from 'viem';
import { useTreasuryStreams } from '@/app/lib/nouns/hooks';
import { useENSBatch } from '@/OS/hooks/useENS';
import {
  formatTokenAmount,
  tokenSymbolForAddress,
} from '../../../Treasury/tabs/utils';
import type { StreamRow } from '@/app/api/nouns/treasury/streams/route';
import styles from './StreamSelect.module.css';

const USDC_ADDR = '0xa0b86991c6218b36c1d19d4a2e9eb0ce3606eb48';
const WETH_ADDR = '0xc02aaa39b223fe8d0a0e5c4f27ead9083c756cc2';

/** True when formatTokenAmount produces a self-describing currency string ($, Ξ). */
function hasInlineSymbol(addr: string): boolean {
  const lower = addr.toLowerCase();
  return lower === USDC_ADDR || lower === WETH_ADDR;
}

/** Compact form for inline use: "$15.7k", "26.9 Ξ", "$1.2M". */
function compactTokenAmount(addr: string, raw: string): string {
  const lower = addr.toLowerCase();
  try {
    if (lower === USDC_ADDR) {
      const n = parseFloat(formatUnits(BigInt(raw), 6));
      if (n >= 1_000_000) return `$${(n / 1_000_000).toFixed(1)}M`;
      if (n >= 10_000) return `$${(n / 1000).toFixed(0)}k`;
      if (n >= 1000) return `$${(n / 1000).toFixed(1)}k`;
      return `$${n.toFixed(0)}`;
    }
    if (lower === WETH_ADDR) {
      const n = parseFloat(formatEther(BigInt(raw)));
      if (n >= 1000) return `${(n / 1000).toFixed(1)}k Ξ`;
      // Show up to 2 decimals, strip trailing zeros so 120.00 → "120", 91.19 → "91.19"
      return `${parseFloat(n.toFixed(2))} Ξ`;
    }
  } catch {
    // fall through
  }
  // Unknown token — defer to the full Treasury formatter.
  return formatTokenAmount(addr, raw);
}

interface StreamSelectProps {
  value: string;
  onChange: (value: string) => void;
  disabled?: boolean;
}

function shortAddr(addr: string): string {
  return `${addr.slice(0, 6)}…${addr.slice(-4)}`;
}

export function StreamSelect({ value, onChange, disabled }: StreamSelectProps) {
  const { data, isLoading, error } = useTreasuryStreams();
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  // Close on click-outside
  useEffect(() => {
    if (!isOpen) return;
    function handle(e: MouseEvent) {
      if (
        containerRef.current &&
        !containerRef.current.contains(e.target as Node)
      ) {
        setIsOpen(false);
      }
    }
    document.addEventListener('mousedown', handle);
    return () => document.removeEventListener('mousedown', handle);
  }, [isOpen]);

  // Only do client-side ENS lookups for recipients the server didn't already
  // resolve via the ponder ens_names join — same trick Treasury's Address uses
  // to avoid redundant requests.
  const recipientsNeedingResolution = useMemo(
    () => (data?.streams ?? [])
      .filter((s) => !s.recipientEns)
      .map((s) => s.recipient),
    [data],
  );
  const ensMap = useENSBatch(recipientsNeedingResolution);

  // Build the resolved display name for a recipient. Treasury app's `Address`
  // skips the client lookup when a server hint exists; we do the same here.
  function displayRecipient(s: StreamRow): string {
    if (s.recipientEns) return s.recipientEns;
    const ens = ensMap.get(s.recipient)?.name;
    return ens || shortAddr(s.recipient);
  }

  // Active and pending streams are both meaningful targets for Cancel /
  // Redirect. Complete streams have nothing left to recover.
  const filtered = useMemo(
    () => (data?.streams ?? []).filter(
      (s) => s.status === 'active' || s.status === 'pending',
    ),
    [data],
  );

  const selected = useMemo(
    () => data?.streams.find(
      (s) => s.streamAddress.toLowerCase() === value.toLowerCase(),
    ),
    [data, value],
  );

  if (isLoading) {
    return <div className={styles.statusMsg}>Loading streams…</div>;
  }
  if (error) {
    return (
      <div className={styles.statusError}>
        Failed to load streams. Use a custom transaction to cancel by address.
      </div>
    );
  }

  const placeholderText = value && !selected
    ? shortAddr(value)
    : 'Select a stream…';

  return (
    <div className={styles.container} ref={containerRef}>
      <button
        type="button"
        className={`${styles.trigger} ${isOpen ? styles.open : ''}`}
        onClick={() => !disabled && setIsOpen((o) => !o)}
        disabled={disabled}
      >
        {selected ? (
          <SelectedSummary stream={selected} recipient={displayRecipient(selected)} />
        ) : (
          <span className={styles.placeholder}>{placeholderText}</span>
        )}
        <span className={styles.arrow}>▼</span>
      </button>

      {isOpen && (
        <div className={styles.dropdown}>
          {filtered.length === 0 ? (
            <div className={styles.emptyMsg}>No active or pending streams.</div>
          ) : (
            <ul className={styles.list} role="listbox">
              {filtered.map((s) => (
                <StreamRowCard
                  key={s.id}
                  stream={s}
                  recipient={displayRecipient(s)}
                  isSelected={s.streamAddress.toLowerCase() === value.toLowerCase()}
                  onSelect={() => {
                    onChange(s.streamAddress);
                    setIsOpen(false);
                  }}
                />
              ))}
            </ul>
          )}
        </div>
      )}
    </div>
  );
}

// ============================================================================
// SelectedSummary — collapsed view shown in the trigger button
// ============================================================================

function SelectedSummary({ stream, recipient }: { stream: StreamRow; recipient: string }) {
  // recoverable = tokenAmount × (1 − vestedRatio), with bigint math at
  // 4-decimal ratio precision (matches the same math used elsewhere).
  const totalRaw = BigInt(stream.tokenAmountRaw);
  const ratioScaled = BigInt(
    Math.round(Math.max(0, Math.min(1, stream.vestedRatio)) * 10_000),
  );
  const vestedRaw = (totalRaw * ratioScaled) / BigInt(10_000);
  const recoverableRaw = (totalRaw - vestedRaw).toString();

  const total = compactTokenAmount(stream.tokenAddress, stream.tokenAmountRaw);
  const recoverable = compactTokenAmount(stream.tokenAddress, recoverableRaw);
  const symbol = tokenSymbolForAddress(stream.tokenAddress);
  const trailingSymbol = !hasInlineSymbol(stream.tokenAddress) ? ` ${symbol}` : '';

  return (
    <span className={styles.triggerContent}>
      <span className={styles.triggerRecipient}>{recipient}</span>
      <span className={styles.triggerSep}>•</span>
      <span className={styles.triggerAmount}>
        {recoverable} recoverable / {total}{trailingSymbol}
      </span>
    </span>
  );
}

// ============================================================================
// StreamRowCard — single stream entry in the dropdown
// ============================================================================

interface StreamRowCardProps {
  stream: StreamRow;
  recipient: string;
  isSelected: boolean;
  onSelect: () => void;
}

function StreamRowCard({ stream, recipient, isSelected, onSelect }: StreamRowCardProps) {
  const amount = formatTokenAmount(stream.tokenAddress, stream.tokenAmountRaw);
  const symbol = tokenSymbolForAddress(stream.tokenAddress);
  const vestedPct = Math.round(stream.vestedRatio * 100);
  const claimedPct = stream.claimedRatio != null ? Math.round(stream.claimedRatio * 100) : null;
  // Use a compact form for the inline claimed amount so it doesn't wrap on
  // verbose USDC values like "$15,700.00".
  const claimedCompact = stream.claimedRaw != null
    ? compactTokenAmount(stream.tokenAddress, stream.claimedRaw)
    : null;

  return (
    <li
      role="option"
      aria-selected={isSelected}
      className={`${styles.row} ${isSelected ? styles.rowSelected : ''}`}
      onClick={onSelect}
    >
      <div className={styles.rowHeader}>
        <span className={styles.rowRecipientGroup}>
          <span className={styles.rowRecipient}>{recipient}</span>
          <span className={styles.rowAddr} title={stream.streamAddress}>
            {shortAddr(stream.streamAddress)}
          </span>
        </span>
        <span className={styles.rowAmount}>
          {amount}
          {!hasInlineSymbol(stream.tokenAddress) && (
            <span className={styles.rowSymbol}> {symbol}</span>
          )}
        </span>
      </div>

      <div className={styles.rowBars}>
        <div className={styles.barColumn}>
          <div className={styles.barLabel}>
            <span>Vested</span>
            <span className={styles.barPct}>{vestedPct}%</span>
          </div>
          <div className={styles.progressBar}>
            <div className={styles.progressFill} style={{ width: `${vestedPct}%` }} />
          </div>
        </div>
        <div className={styles.barColumn}>
          <div className={styles.barLabel}>
            <span>Claimed</span>
            <span className={styles.barPct}>
              {claimedPct != null ? `${claimedPct}%` : '—'}
              {claimedCompact && (
                <span className={styles.barClaimedAmt}> ({claimedCompact})</span>
              )}
            </span>
          </div>
          <div className={styles.progressBar}>
            <div
              className={styles.progressFill}
              style={{ width: `${claimedPct ?? 0}%` }}
            />
          </div>
        </div>
      </div>
    </li>
  );
}

