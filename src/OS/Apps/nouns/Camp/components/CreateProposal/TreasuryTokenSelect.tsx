'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { formatUnits } from 'viem';
import { useTreasuryFullBalances } from '@/app/lib/nouns/hooks';
import type { TreasuryTokenBalance } from '@/app/api/nouns/treasury/balances/route';
import { KNOWN_VOTES_TOKENS } from '../../utils/actionTemplates/constants';
import styles from './TreasuryTokenSelect.module.css';

/** Format a raw bigint string balance to at most 3 decimals, with commas. */
function roundBalance(rawBalance: string, decimals: number): string {
  try {
    const n = parseFloat(formatUnits(BigInt(rawBalance), decimals));
    return n.toLocaleString('en-US', {
      minimumFractionDigits: 0,
      maximumFractionDigits: 3,
    });
  } catch {
    return rawBalance;
  }
}

/** Sentinel address used to represent native ETH in the token field. */
export const NATIVE_ETH_SENTINEL = '0x0000000000000000000000000000000000000000';

const USDC_ADDR = '0xa0b86991c6218b36c1d19d4a2e9eb0ce3606eb48';
const WETH_ADDR = '0xc02aaa39b223fe8d0a0e5c4f27ead9083c756cc2';

export interface TreasuryTokenSelection {
  symbol: string;
  address: string;
  decimals: number;
  isNative: boolean;
  /** Raw bigint string balance, for "use max" UX or validation later. */
  rawBalance?: string;
  /** Pre-formatted display balance for the dropdown. */
  formattedBalance?: string;
  valueUsd?: number;
}

type Option = TreasuryTokenSelection;

interface TreasuryTokenSelectProps {
  value: string; // JSON-stringified TreasuryTokenSelection
  onChange: (value: string) => void;
  disabled?: boolean;
  /**
   * When true, restricts the picker to known ERC20Votes tokens (KNOWN_VOTES_TOKENS)
   * and hides native ETH. Used by templates that call delegate(address).
   */
  votesOnly?: boolean;
}

function safeParse(value: string): TreasuryTokenSelection | null {
  if (!value) return null;
  try {
    const parsed = JSON.parse(value);
    if (parsed && typeof parsed.address === 'string') return parsed as TreasuryTokenSelection;
  } catch {
    /* ignore */
  }
  return null;
}

function fmtUsd(n: number): string {
  if (n >= 1_000_000) return `$${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 10_000) return `$${(n / 1000).toFixed(0)}k`;
  if (n >= 1000) return `$${(n / 1000).toFixed(1)}k`;
  return `$${n.toFixed(0)}`;
}

export function TreasuryTokenSelect({
  value,
  onChange,
  disabled,
  votesOnly = false,
}: TreasuryTokenSelectProps) {
  const { data, isLoading, error } = useTreasuryFullBalances();
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

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

  // Build sectioned option list:
  //   - pinned: ETH, USDC, WETH (in that order)
  //   - staked: eth_derivative tokens (wstETH, stETH, rETH, mETH, ...)
  //   - other: everything else, sorted by USD value desc
  // votesOnly mode collapses everything into a single "pinned" section.
  const sections = useMemo<{
    pinned: Option[];
    staked: Option[];
    other: Option[];
  }>(() => {
    const pinned: Option[] = [];
    const staked: Option[] = [];
    const other: Option[] = [];
    const v2 = data?.v2;
    if (!v2) return { pinned, staked, other };

    if (votesOnly) {
      const votesAddrs = new Set(Object.keys(KNOWN_VOTES_TOKENS));
      const filtered = v2.tokens
        .filter((t) => votesAddrs.has(t.address.toLowerCase()))
        .sort((a, b) => b.valueUsd - a.valueUsd);
      for (const t of filtered) pinned.push(tokenToOption(t));
      return { pinned, staked, other };
    }

    // 1. Native ETH (always pinned first).
    pinned.push({
      symbol: 'ETH',
      address: NATIVE_ETH_SENTINEL,
      decimals: 18,
      isNative: true,
      rawBalance: v2.nativeEth.rawWei,
      formattedBalance: roundBalance(v2.nativeEth.rawWei, 18),
      valueUsd: v2.nativeEth.valueUsd ?? 0,
    });

    // 2 & 3. USDC and WETH pinned next, if held.
    const byAddr = new Map<string, TreasuryTokenBalance>();
    for (const t of v2.tokens) byAddr.set(t.address.toLowerCase(), t);

    const usdc = byAddr.get(USDC_ADDR);
    if (usdc) pinned.push(tokenToOption(usdc));

    const weth = byAddr.get(WETH_ADDR);
    if (weth) pinned.push(tokenToOption(weth));

    // Remaining tokens split into staked (eth_derivative) and other, each
    // sorted by USD value desc within their group.
    const remaining = v2.tokens
      .filter((t) => {
        const addr = t.address.toLowerCase();
        return addr !== USDC_ADDR && addr !== WETH_ADDR;
      })
      .sort((a, b) => b.valueUsd - a.valueUsd);

    for (const t of remaining) {
      const opt = tokenToOption(t);
      if (t.category === 'eth_derivative') staked.push(opt);
      else other.push(opt);
    }

    return { pinned, staked, other };
  }, [data, votesOnly]);

  const options = useMemo<Option[]>(
    () => [...sections.pinned, ...sections.staked, ...sections.other],
    [sections],
  );

  const selected = safeParse(value);
  const selectedOption = selected
    ? options.find(
        (o) => o.address.toLowerCase() === selected.address.toLowerCase(),
      ) ?? selected
    : null;

  function pick(opt: TreasuryTokenSelection) {
    onChange(
      JSON.stringify({
        symbol: opt.symbol,
        address: opt.address,
        decimals: opt.decimals,
        isNative: opt.isNative,
        rawBalance: opt.rawBalance,
        formattedBalance: opt.formattedBalance,
        valueUsd: opt.valueUsd,
      }),
    );
    setIsOpen(false);
  }

  return (
    <div className={styles.container} ref={containerRef}>
      <button
        type="button"
        className={`${styles.trigger} ${isOpen ? styles.open : ''}`}
        onClick={() => !disabled && setIsOpen((o) => !o)}
        disabled={disabled}
      >
        {selectedOption ? (
          <span className={styles.triggerContent}>
            <span className={styles.triggerSymbol}>{selectedOption.symbol}</span>
            {selectedOption.formattedBalance && (
              <span className={styles.triggerBalance}>
                {selectedOption.formattedBalance}
              </span>
            )}
            {selectedOption.valueUsd != null && selectedOption.valueUsd > 0 && (
              <span className={styles.triggerValue}>
                · {fmtUsd(selectedOption.valueUsd)}
              </span>
            )}
          </span>
        ) : (
          <span className={styles.placeholder}>
            {isLoading ? 'Loading holdings…' : 'Select token…'}
          </span>
        )}
        <span className={styles.arrow}>▼</span>
      </button>

      {isOpen && (
        <div className={styles.dropdown}>
          {error ? (
            <div className={styles.emptyMsg}>
              Failed to load treasury holdings.
            </div>
          ) : isLoading ? (
            <div className={styles.emptyMsg}>Loading holdings…</div>
          ) : options.length === 0 ? (
            <div className={styles.emptyMsg}>
              {votesOnly
                ? 'No ERC20Votes tokens in the treasury.'
                : 'No tokens in the treasury.'}
            </div>
          ) : (
            <ul className={styles.list} role="listbox">
              {sections.pinned.map((opt) =>
                renderRow(opt, selected, pick, styles),
              )}
              {sections.staked.length > 0 && sections.pinned.length > 0 && (
                <li className={styles.divider} aria-hidden="true" />
              )}
              {sections.staked.map((opt) =>
                renderRow(opt, selected, pick, styles),
              )}
              {sections.other.length > 0 &&
                (sections.pinned.length > 0 || sections.staked.length > 0) && (
                  <li className={styles.divider} aria-hidden="true" />
                )}
              {sections.other.map((opt) =>
                renderRow(opt, selected, pick, styles),
              )}
            </ul>
          )}
        </div>
      )}
    </div>
  );
}

function renderRow(
  opt: Option,
  selected: TreasuryTokenSelection | null,
  onPick: (opt: Option) => void,
  styles: Record<string, string>,
) {
  const isSelected =
    !!selected &&
    selected.address.toLowerCase() === opt.address.toLowerCase();
  return (
    <li
      key={opt.address}
      role="option"
      aria-selected={isSelected}
      className={`${styles.row} ${isSelected ? styles.rowSelected : ''}`}
      onClick={() => onPick(opt)}
    >
      <span className={styles.rowSymbol}>{opt.symbol}</span>
      <span className={styles.rowBalance}>{opt.formattedBalance ?? '—'}</span>
      {opt.valueUsd != null && opt.valueUsd > 0 && (
        <span className={styles.rowValue}>{fmtUsd(opt.valueUsd)}</span>
      )}
    </li>
  );
}

function tokenToOption(t: TreasuryTokenBalance): Option {
  return {
    symbol: t.symbol,
    address: t.address,
    decimals: t.decimals,
    isNative: false,
    rawBalance: t.rawBalance,
    formattedBalance: roundBalance(t.rawBalance, t.decimals),
    valueUsd: t.valueUsd,
  };
}
