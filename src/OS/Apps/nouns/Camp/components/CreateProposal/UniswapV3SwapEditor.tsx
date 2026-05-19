/**
 * UniswapV3SwapEditor
 * Live-quoting custom editor for the `swap-uniswap-v3` template.
 *
 * Flow:
 *  1. Pick input token (treasury-token picker — same as treasury-transfer)
 *  2. Paste output token address (auto-resolves symbol + decimals via on-chain read)
 *  3. Enter input amount
 *  4. Editor fetches a quote per fee tier in parallel (Uniswap QuoterV2),
 *     auto-selects the best-output pool, and shows live "you receive" preview
 *  5. User dials slippage % (default 1%) and the minimum-out is computed
 *     automatically and pushed into the template's amountOutMinimum field
 *
 * No manual decimals math, no fee-tier guessing, no off-line price lookup.
 */

'use client';

import { useEffect, useMemo, useState } from 'react';
import { formatUnits, isAddress, parseUnits } from 'viem';
import {
  UNISWAP_V3_FEE_TIERS,
  type UniswapV3FeeTier,
} from '../../utils/actionTemplates/constants';
import type { TemplateFieldValues } from '../../utils/actionTemplates';
import { useTokenMetadata } from '../../hooks/useTokenMetadata';
import { useUniswapV3Quotes } from '../../hooks/useUniswapV3Quotes';
import { TreasuryTokenSelect } from './TreasuryTokenSelect';
import { AddressInput } from './AddressInput';
import editorStyles from './ActionTemplateEditor.module.css';
import styles from './UniswapV3SwapEditor.module.css';

interface UniswapV3SwapEditorProps {
  fieldValues: TemplateFieldValues;
  onUpdateField: (field: string, value: string) => void;
  disabled?: boolean;
}

const FEE_LABELS: Record<UniswapV3FeeTier, string> = {
  100: '0.01%',
  500: '0.05%',
  3000: '0.3%',
  10000: '1%',
};

function parseTokenInJson(raw: string | undefined): {
  address: string | undefined;
  symbol: string | undefined;
  decimals: number | undefined;
} {
  if (!raw) return { address: undefined, symbol: undefined, decimals: undefined };
  try {
    const parsed = JSON.parse(raw);
    return {
      address: typeof parsed.address === 'string' ? parsed.address : undefined,
      symbol: typeof parsed.symbol === 'string' ? parsed.symbol : undefined,
      decimals:
        typeof parsed.decimals === 'number' ? parsed.decimals : undefined,
    };
  } catch {
    return { address: undefined, symbol: undefined, decimals: undefined };
  }
}

function formatTokenAmount(amount: bigint, decimals: number): string {
  const formatted = formatUnits(amount, decimals);
  const num = parseFloat(formatted);
  if (num === 0) return '0';
  if (num < 0.0001) return num.toExponential(2);
  if (num < 1) return num.toFixed(6).replace(/0+$/, '').replace(/\.$/, '');
  if (num < 1000) return num.toFixed(4).replace(/0+$/, '').replace(/\.$/, '');
  return num.toLocaleString('en-US', { maximumFractionDigits: 2 });
}

export function UniswapV3SwapEditor({
  fieldValues,
  onUpdateField,
  disabled = false,
}: UniswapV3SwapEditorProps) {
  const tokenIn = parseTokenInJson(fieldValues.tokenIn);
  const tokenOutAddress = fieldValues.tokenOut || '';
  const tokenOutValid = isAddress(tokenOutAddress);
  const tokenOutMeta = useTokenMetadata(
    tokenOutValid ? tokenOutAddress : undefined,
  );

  const amountInRaw = fieldValues.amountIn || '';
  const amountInBigInt = useMemo(() => {
    if (!tokenIn.decimals || !amountInRaw) return BigInt(0);
    try {
      return parseUnits(amountInRaw, tokenIn.decimals);
    } catch {
      return BigInt(0);
    }
  }, [amountInRaw, tokenIn.decimals]);

  const { quotes, bestFee, isLoading: quotesLoading } = useUniswapV3Quotes(
    tokenIn.address,
    tokenOutValid ? tokenOutAddress : undefined,
    amountInBigInt,
  );

  // Auto-select the best fee tier on first quote, unless the user already
  // picked one explicitly.
  const [userPickedFee, setUserPickedFee] = useState(false);
  const selectedFee: UniswapV3FeeTier = userPickedFee
    ? (Number(fieldValues.fee) as UniswapV3FeeTier)
    : bestFee || (Number(fieldValues.fee || '3000') as UniswapV3FeeTier);

  useEffect(() => {
    if (!userPickedFee && bestFee) {
      onUpdateField('fee', String(bestFee));
    }
  }, [bestFee, userPickedFee, onUpdateField]);

  const selectedQuote = quotes[selectedFee];

  // Slippage % — default 1.
  const slippageRaw = fieldValues.slippage || '1';
  const slippagePct = parseFloat(slippageRaw) || 0;
  const slippageBps = Math.max(0, Math.min(10000, Math.round(slippagePct * 100)));

  // amountOutMinimum = quote × (1 − slippage). Written back into the field
  // values so the generator picks it up unchanged.
  useEffect(() => {
    if (!selectedQuote || !tokenOutMeta.decimals) return;
    const minOut =
      (selectedQuote * BigInt(10000 - slippageBps)) / BigInt(10000);
    onUpdateField('amountOutMinimum', formatUnits(minOut, tokenOutMeta.decimals));
  }, [selectedQuote, slippageBps, tokenOutMeta.decimals, onUpdateField]);

  // Auto-write tokenOutDecimals so the generator can scale amountOutMinimum
  // back to wei correctly without re-fetching metadata.
  useEffect(() => {
    if (tokenOutMeta.decimals !== undefined) {
      onUpdateField('tokenOutDecimals', String(tokenOutMeta.decimals));
    }
  }, [tokenOutMeta.decimals, onUpdateField]);

  const handleFeeClick = (fee: UniswapV3FeeTier) => {
    setUserPickedFee(true);
    onUpdateField('fee', String(fee));
  };

  return (
    <div className={editorStyles.templateForm}>
      {/* Input token */}
      <div className={editorStyles.inputGroup}>
        <label className={editorStyles.label}>
          From Token <span className={editorStyles.required}>*</span>
        </label>
        <TreasuryTokenSelect
          value={fieldValues.tokenIn || ''}
          onChange={(v) => onUpdateField('tokenIn', v)}
          disabled={disabled}
        />
        <div className={editorStyles.helpText}>
          Token to sell from the treasury.
        </div>
      </div>

      {/* Output token */}
      <div className={editorStyles.inputGroup}>
        <label className={editorStyles.label}>
          To Token <span className={editorStyles.required}>*</span>
        </label>
        <AddressInput
          value={tokenOutAddress}
          onChange={(v) => onUpdateField('tokenOut', v)}
          placeholder="0x... (paste the token contract address)"
          disabled={disabled}
        />
        {tokenOutValid && tokenOutMeta.symbol && (
          <div className={styles.tokenOutPreview}>
            <strong>{tokenOutMeta.symbol}</strong>
            {tokenOutMeta.name && tokenOutMeta.name !== tokenOutMeta.symbol && (
              <span className={styles.tokenOutName}> · {tokenOutMeta.name}</span>
            )}
            <span className={styles.tokenOutDecimals}>
              {' '}
              · {tokenOutMeta.decimals} decimals
            </span>
          </div>
        )}
        {tokenOutValid && tokenOutMeta.isLoading && (
          <div className={editorStyles.helpText}>Fetching token info…</div>
        )}
        {tokenOutValid && !tokenOutMeta.isLoading && !tokenOutMeta.symbol && (
          <div className={editorStyles.error}>
            Couldn&apos;t read this token from chain. Verify the address is an
            ERC-20 contract.
          </div>
        )}
      </div>

      {/* Amount in */}
      <div className={editorStyles.inputGroup}>
        <label className={editorStyles.label}>
          Amount In
          {tokenIn.symbol ? ` (${tokenIn.symbol})` : ''}
          <span className={editorStyles.required}>*</span>
        </label>
        <input
          type="text"
          className={editorStyles.input}
          value={amountInRaw}
          onChange={(e) => onUpdateField('amountIn', e.target.value)}
          placeholder="0.0"
          disabled={disabled}
          inputMode="decimal"
        />
      </div>

      {/* Quote panel */}
      {tokenIn.address && tokenOutValid && amountInBigInt > BigInt(0) && (
        <div className={styles.quotePanel}>
          <div className={styles.quotePanelHeader}>
            Live quote
            {quotesLoading && (
              <span className={styles.quoteLoading}>fetching…</span>
            )}
          </div>
          <div className={styles.feeTierRow}>
            {UNISWAP_V3_FEE_TIERS.map((fee) => {
              const quote = quotes[fee];
              const isSelected = fee === selectedFee;
              const isBest = fee === bestFee;
              return (
                <button
                  key={fee}
                  type="button"
                  className={`${styles.feeTier} ${isSelected ? styles.feeTierSelected : ''}`}
                  onClick={() => handleFeeClick(fee)}
                  disabled={disabled}
                >
                  <span className={styles.feeTierLabel}>{FEE_LABELS[fee]}</span>
                  <span className={styles.feeTierAmount}>
                    {quote !== null && tokenOutMeta.decimals !== undefined
                      ? formatTokenAmount(quote, tokenOutMeta.decimals)
                      : quotesLoading
                        ? '…'
                        : '—'}
                  </span>
                  {isBest && quote !== null && (
                    <span className={styles.feeTierBest}>best</span>
                  )}
                </button>
              );
            })}
          </div>
          <div className={styles.quoteSummary}>
            {selectedQuote !== null && tokenOutMeta.decimals !== undefined ? (
              <>
                You receive{' '}
                <strong>
                  ~{formatTokenAmount(selectedQuote, tokenOutMeta.decimals)}{' '}
                  {tokenOutMeta.symbol || ''}
                </strong>{' '}
                via the {FEE_LABELS[selectedFee]} pool.
              </>
            ) : (
              <span className={styles.quoteEmpty}>
                No Uniswap V3 pool found for this pair at the selected fee
                tier. Try a different fee tier above.
              </span>
            )}
          </div>
        </div>
      )}

      {/* Slippage */}
      <div className={editorStyles.inputGroup}>
        <label className={editorStyles.label}>
          Slippage Tolerance (%)
          <span className={editorStyles.required}>*</span>
        </label>
        <div className={styles.slippageRow}>
          {[0.5, 1, 3, 5].map((preset) => (
            <button
              key={preset}
              type="button"
              className={`${styles.slippagePreset} ${
                Math.abs(slippagePct - preset) < 0.001
                  ? styles.slippagePresetSelected
                  : ''
              }`}
              onClick={() => onUpdateField('slippage', String(preset))}
              disabled={disabled}
            >
              {preset}%
            </button>
          ))}
          <input
            type="text"
            inputMode="decimal"
            className={styles.slippageInput}
            value={slippageRaw}
            onChange={(e) => onUpdateField('slippage', e.target.value)}
            disabled={disabled}
            placeholder="1"
          />
        </div>
        {selectedQuote !== null && tokenOutMeta.decimals !== undefined && (
          <div className={editorStyles.helpText}>
            Min received:{' '}
            <strong>
              {formatTokenAmount(
                (selectedQuote * BigInt(10000 - slippageBps)) / BigInt(10000),
                tokenOutMeta.decimals,
              )}{' '}
              {tokenOutMeta.symbol || ''}
            </strong>{' '}
            — proposal reverts if execution falls below this.
          </div>
        )}
      </div>
    </div>
  );
}
