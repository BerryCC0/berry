/**
 * SwapToUsdcEditor — focused USDC swapper for treasury holdings.
 *
 * Three source tokens (ETH, WETH, wstETH) shown as chips. The editor:
 *   1. Quotes Uniswap V3 across all four fee tiers in parallel (live).
 *   2. Auto-picks the best-output tier.
 *   3. Computes amountOutMinimum from quote × (1 − slippage) and writes it
 *      to the `amountOutMinimum` field.
 *   4. Writes `sourceToken` / `amountIn` / `fee` back into the draft.
 *
 * The action def (`swap-to-usdc`) handles the ETH wrap step in encode —
 * the editor doesn't need to emit it separately.
 */

'use client';

import { useEffect, useMemo, useState } from 'react';
import { formatUnits, parseUnits, type Address } from 'viem';
import type { TemplateFieldValues } from '../../actionTemplates';
import {
  COMMON_TOKENS,
  EXTERNAL_CONTRACTS,
  UNISWAP_V3_FEE_TIERS,
  WSTETH_ADDRESS,
  type UniswapV3FeeTier,
} from '../../actionTemplates/constants';
import { useUniswapV3Quotes } from '../../../hooks/useUniswapV3Quotes';
import styles from './SwapToUsdcEditor.module.css';

interface Props {
  fieldValues: TemplateFieldValues;
  onUpdateField: (field: string, value: string) => void;
  disabled?: boolean;
}

type Source = 'eth' | 'weth' | 'wsteth';

interface SourceMeta {
  key: Source;
  label: string;
  /** Symbol shown in the input adornment and quote panel. */
  symbol: string;
  /** Address used as `tokenIn` in the Uniswap V3 swap. ETH wraps to WETH. */
  swapTokenIn: Address;
  /** Help line under the chip row. */
  blurb: string;
}

const WETH = EXTERNAL_CONTRACTS.WETH.address as Address;
const USDC_ADDR = EXTERNAL_CONTRACTS.USDC.address as Address;
const USDC_DECIMALS =
  COMMON_TOKENS.find((t) => t.symbol === 'USDC')?.decimals ?? 6;

const SOURCES: SourceMeta[] = [
  {
    key: 'eth',
    label: 'ETH',
    symbol: 'ETH',
    swapTokenIn: WETH,
    blurb: 'Auto-wraps to WETH before swapping. 3 on-chain actions.',
  },
  {
    key: 'weth',
    label: 'WETH',
    symbol: 'WETH',
    swapTokenIn: WETH,
    blurb: 'Direct WETH → USDC swap. 2 on-chain actions.',
  },
  {
    key: 'wsteth',
    label: 'wstETH',
    symbol: 'wstETH',
    swapTokenIn: WSTETH_ADDRESS as Address,
    blurb: 'Direct wstETH → USDC swap. 2 on-chain actions.',
  },
];

const FEE_LABELS: Record<UniswapV3FeeTier, string> = {
  100: '0.01%',
  500: '0.05%',
  3000: '0.3%',
  10000: '1%',
};

const SLIPPAGE_PRESETS: Array<{ label: string; bps: number }> = [
  { label: '0.5%', bps: 50 },
  { label: '1%', bps: 100 },
  { label: '2%', bps: 200 },
];

function formatUsdc(amount: bigint): string {
  const raw = formatUnits(amount, USDC_DECIMALS);
  const num = parseFloat(raw);
  if (num === 0) return '0';
  if (num < 0.01) return num.toFixed(6).replace(/0+$/, '').replace(/\.$/, '');
  return num.toLocaleString('en-US', { maximumFractionDigits: 2 });
}

export function SwapToUsdcEditor({
  fieldValues,
  onUpdateField,
  disabled,
}: Props) {
  // --- Field reads ------------------------------------------------------
  const sourceFromDraft = (fieldValues.sourceToken ?? '') as string;
  const source: Source =
    sourceFromDraft === 'eth' ||
    sourceFromDraft === 'weth' ||
    sourceFromDraft === 'wsteth'
      ? sourceFromDraft
      : 'weth';
  const amountInRaw = fieldValues.amountIn ?? '';
  const slippageBpsStored = Number(fieldValues.slippageBps ?? '100') || 100;
  const userPickedFee = fieldValues.fee && Number(fieldValues.fee) > 0;
  const storedFee = userPickedFee
    ? (Number(fieldValues.fee) as UniswapV3FeeTier)
    : null;

  // --- Default source token once on mount -------------------------------
  useEffect(() => {
    if (!fieldValues.sourceToken) onUpdateField('sourceToken', 'weth');
    // Single-shot defaulting; intentionally only fires when sourceToken is empty.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const sourceMeta = SOURCES.find((s) => s.key === source)!;

  // --- Parse amountIn (always 18 decimals — ETH/WETH/wstETH) ------------
  const amountInWei = useMemo(() => {
    if (!amountInRaw) return BigInt(0);
    try {
      return parseUnits(amountInRaw, 18);
    } catch {
      return BigInt(0);
    }
  }, [amountInRaw]);

  // --- Live quotes across all four fee tiers ----------------------------
  const { quotes, bestFee, isLoading: quotesLoading } = useUniswapV3Quotes(
    sourceMeta.swapTokenIn,
    USDC_ADDR,
    amountInWei,
  );

  // Auto-pick the best fee tier unless user manually selected one.
  const [userOverrodeFee, setUserOverrodeFee] = useState(false);
  const effectiveFee: UniswapV3FeeTier | null = userOverrodeFee
    ? storedFee ?? bestFee
    : bestFee ?? storedFee;

  useEffect(() => {
    if (!userOverrodeFee && bestFee && String(bestFee) !== fieldValues.fee) {
      onUpdateField('fee', String(bestFee));
    }
  }, [bestFee, userOverrodeFee, fieldValues.fee, onUpdateField]);

  const selectedQuote = effectiveFee !== null ? quotes[effectiveFee] : null;

  // --- amountOutMinimum = quote × (1 - slippage) ------------------------
  useEffect(() => {
    if (!selectedQuote) return;
    const minOut =
      (selectedQuote * BigInt(10000 - slippageBpsStored)) / BigInt(10000);
    const minOutDisplay = formatUnits(minOut, USDC_DECIMALS);
    if (minOutDisplay !== fieldValues.amountOutMinimum) {
      onUpdateField('amountOutMinimum', minOutDisplay);
    }
  }, [selectedQuote, slippageBpsStored, fieldValues.amountOutMinimum, onUpdateField]);

  // --- Handlers ---------------------------------------------------------
  const pickSource = (key: Source) => {
    if (key === source) return;
    onUpdateField('sourceToken', key);
    // Re-quote on a different tokenIn — clear the user's fee pick so the
    // best tier for the new pair gets auto-selected.
    setUserOverrodeFee(false);
    onUpdateField('fee', '');
  };

  const pickFee = (fee: UniswapV3FeeTier) => {
    setUserOverrodeFee(true);
    onUpdateField('fee', String(fee));
  };

  const pickSlippage = (bps: number) => {
    onUpdateField('slippageBps', String(bps));
  };

  // --- Derived display --------------------------------------------------
  const noQuoteAtAll =
    !quotesLoading && Object.values(quotes).every((q) => q === null);

  return (
    <div className={styles.editor}>
      {/* Source token chips */}
      <div className={styles.fieldGroup}>
        <label className={styles.fieldLabel}>From</label>
        <div className={styles.chipRow}>
          {SOURCES.map((s) => (
            <button
              key={s.key}
              type="button"
              className={`${styles.chip} ${s.key === source ? styles.chipActive : ''}`}
              onClick={() => pickSource(s.key)}
              disabled={disabled}
            >
              {s.label}
            </button>
          ))}
        </div>
        <div className={styles.fieldHint}>{sourceMeta.blurb}</div>
      </div>

      {/* Amount input */}
      <div className={styles.fieldGroup}>
        <label className={styles.fieldLabel}>Amount In</label>
        <div className={styles.amountInputWrap}>
          <input
            type="text"
            inputMode="decimal"
            className={styles.amountInput}
            placeholder="0.0"
            value={amountInRaw}
            onChange={(e) => onUpdateField('amountIn', e.target.value)}
            disabled={disabled}
          />
          <span className={styles.amountSuffix}>{sourceMeta.symbol}</span>
        </div>
      </div>

      {/* Live quote panel */}
      <div className={styles.quotePanel}>
        <div className={styles.quotePanelHeader}>
          Live quote
          {quotesLoading && (
            <span className={styles.quoteLoading}>fetching…</span>
          )}
        </div>
        <div className={styles.feeRow}>
          {UNISWAP_V3_FEE_TIERS.map((fee) => {
            const quote = quotes[fee];
            const isBest = bestFee === fee;
            const isSelected = effectiveFee === fee;
            return (
              <button
                key={fee}
                type="button"
                className={`${styles.feeChip} ${isSelected ? styles.feeChipActive : ''}`}
                onClick={() => pickFee(fee)}
                disabled={disabled || quote === null}
              >
                <span className={styles.feeChipLabel}>{FEE_LABELS[fee]}</span>
                <span className={styles.feeChipValue}>
                  {quote !== null
                    ? `${formatUsdc(quote)} USDC`
                    : quotesLoading
                      ? '…'
                      : '—'}
                </span>
                {isBest && quote !== null && (
                  <span className={styles.bestBadge}>best</span>
                )}
              </button>
            );
          })}
        </div>
        {selectedQuote !== null && selectedQuote !== undefined && (
          <div className={styles.quoteSummary}>
            <span>You receive (before slippage):</span>
            <strong>{formatUsdc(selectedQuote)} USDC</strong>
          </div>
        )}
        {noQuoteAtAll && amountInWei > BigInt(0) && (
          <div className={styles.quoteEmpty}>
            No Uniswap V3 liquidity for {sourceMeta.symbol} → USDC at this
            size. For LST routing through WETH, use the generic Uniswap V3
            template instead.
          </div>
        )}
      </div>

      {/* Slippage */}
      <div className={styles.fieldGroup}>
        <label className={styles.fieldLabel}>Slippage tolerance</label>
        <div className={styles.chipRow}>
          {SLIPPAGE_PRESETS.map((s) => (
            <button
              key={s.bps}
              type="button"
              className={`${styles.chip} ${s.bps === slippageBpsStored ? styles.chipActive : ''}`}
              onClick={() => pickSlippage(s.bps)}
              disabled={disabled}
            >
              {s.label}
            </button>
          ))}
        </div>
      </div>

      {/* Summary */}
      {selectedQuote !== null && selectedQuote !== undefined && (
        <div className={styles.summaryCard}>
          <div className={styles.summaryRow}>
            <span className={styles.summaryLabel}>Min received</span>
            <span className={styles.summaryValue}>
              {fieldValues.amountOutMinimum
                ? `${parseFloat(fieldValues.amountOutMinimum).toLocaleString('en-US', { maximumFractionDigits: 2 })} USDC`
                : '—'}
            </span>
          </div>
          <div className={styles.summaryRow}>
            <span className={styles.summaryLabel}>
              At {SLIPPAGE_PRESETS.find((s) => s.bps === slippageBpsStored)?.label ?? `${slippageBpsStored / 100}%`} slippage
            </span>
            <span className={styles.summaryValue}>
              fee tier {effectiveFee !== null ? FEE_LABELS[effectiveFee] : '—'}
            </span>
          </div>
          {source === 'eth' && (
            <div className={styles.summaryNote}>
              Proposal will wrap ETH to WETH, approve the Uniswap router,
              and execute the swap — 3 on-chain actions in one bundle.
            </div>
          )}
        </div>
      )}
    </div>
  );
}
