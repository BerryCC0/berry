/**
 * WithdrawTokenFromRewardsEditor
 * Custom editor for the `admin-rewards-withdraw-token` template.
 *
 * Unlike most "pick a token" templates in Camp, this one is NOT about
 * spending treasury tokens — it sweeps tokens out of the ClientRewards
 * contract itself. So every balance shown here is the ClientRewards
 * contract's balance, never the treasury's.
 *
 * Flow:
 *  1. Quick-pick chips for the most common reward tokens (WETH, USDC, plus
 *     the configured `ethToken()` if it differs) — each chip displays the
 *     ClientRewards contract's CURRENT balance of that token, so the
 *     proposer instantly sees what there is to sweep
 *  2. Custom token address input as a fallback for less common tokens
 *  3. Once a token is selected: amount field with a Max button that drops
 *     the contract's full balance in, plus an inline guard if the amount
 *     would exceed it
 *  4. Recipient defaults to Treasury with a one-tap reset
 */

'use client';

import { useEffect, useMemo } from 'react';
import { formatUnits, isAddress, parseUnits, type Address } from 'viem';
import { useReadContracts } from 'wagmi';
import type { TemplateFieldValues } from '../../utils/actionTemplates';
import {
  CLIENT_REWARDS_ADDRESS,
  EXTERNAL_CONTRACTS,
  MINIMAL_ERC20_ABI,
  TREASURY_ADDRESS,
} from '../../utils/actionTemplates/constants';
import { useClientRewardsState } from '../../hooks/useClientRewardsState';
import { AddressInput } from './AddressInput';
import editorStyles from './ActionTemplateEditor.module.css';
import styles from './WithdrawTokenFromRewardsEditor.module.css';

const BALANCE_OF_ABI = [
  {
    name: 'balanceOf',
    type: 'function',
    stateMutability: 'view',
    inputs: [{ type: 'address' }],
    outputs: [{ type: 'uint256' }],
  },
] as const;

interface CommonRewardToken {
  symbol: string;
  address: Address;
  decimals: number;
  hint?: string;
}

// Tokens the ClientRewards contract is most likely to hold. WETH is the
// configured payout token; USDC shows up if anyone routes USDC rewards or
// donates by mistake. The configured `ethToken()` is appended dynamically
// in case the DAO switches it.
const COMMON_TOKENS: CommonRewardToken[] = [
  {
    symbol: 'WETH',
    address: EXTERNAL_CONTRACTS.WETH.address,
    decimals: 18,
    hint: 'reward payout token',
  },
  {
    symbol: 'USDC',
    address: EXTERNAL_CONTRACTS.USDC.address,
    decimals: 6,
  },
];

interface WithdrawTokenFromRewardsEditorProps {
  fieldValues: TemplateFieldValues;
  onUpdateField: (field: string, value: string) => void;
  disabled?: boolean;
}

function parseToken(raw: string | undefined): {
  address: string | undefined;
  symbol: string | undefined;
  decimals: number;
  isNative: boolean;
} {
  if (!raw) return { address: undefined, symbol: undefined, decimals: 18, isNative: false };
  try {
    const p = JSON.parse(raw);
    return {
      address: typeof p.address === 'string' ? p.address : undefined,
      symbol: typeof p.symbol === 'string' ? p.symbol : undefined,
      decimals: typeof p.decimals === 'number' ? p.decimals : 18,
      isNative: !!p.isNative,
    };
  } catch {
    return { address: undefined, symbol: undefined, decimals: 18, isNative: false };
  }
}

function serialiseToken(t: { symbol: string; address: string; decimals: number }): string {
  return JSON.stringify({
    symbol: t.symbol,
    address: t.address,
    decimals: t.decimals,
    isNative: false,
  });
}

function formatBalance(amount: bigint, decimals: number): string {
  const s = formatUnits(amount, decimals);
  const n = parseFloat(s);
  if (n === 0) return '0';
  if (n < 0.0001) return n.toExponential(2);
  if (n < 1) return n.toFixed(6).replace(/0+$/, '').replace(/\.$/, '');
  if (n < 1000) return n.toFixed(4).replace(/0+$/, '').replace(/\.$/, '');
  return n.toLocaleString('en-US', { maximumFractionDigits: 2 });
}

function isTreasuryAddress(addr: string | undefined): boolean {
  if (!addr) return false;
  return addr.toLowerCase() === TREASURY_ADDRESS.toLowerCase();
}

export function WithdrawTokenFromRewardsEditor({
  fieldValues,
  onUpdateField,
  disabled = false,
}: WithdrawTokenFromRewardsEditorProps) {
  const selectedToken = parseToken(fieldValues.token);
  const rewardsState = useClientRewardsState();

  // Build the quick-pick list: COMMON_TOKENS plus the configured ethToken
  // when it isn't already in the list (defensive — in case the DAO ever
  // routes rewards through a non-WETH wrapper).
  const quickPickTokens: CommonRewardToken[] = useMemo(() => {
    const base = [...COMMON_TOKENS];
    if (
      rewardsState.ethToken &&
      !base.some(
        (t) => t.address.toLowerCase() === rewardsState.ethToken!.toLowerCase(),
      )
    ) {
      base.unshift({
        symbol: 'ethToken',
        address: rewardsState.ethToken,
        decimals: 18,
        hint: 'configured reward token',
      });
    }
    return base;
  }, [rewardsState.ethToken]);

  // Read the ClientRewards balance of every quick-pick token in one
  // multicall round-trip, plus the currently selected token if it isn't
  // one of the quick picks.
  const tokensToRead = useMemo<Address[]>(() => {
    const set = new Set<string>();
    quickPickTokens.forEach((t) => set.add(t.address.toLowerCase()));
    if (
      selectedToken.address &&
      !selectedToken.isNative &&
      isAddress(selectedToken.address)
    ) {
      set.add(selectedToken.address.toLowerCase());
    }
    return Array.from(set) as Address[];
  }, [quickPickTokens, selectedToken.address, selectedToken.isNative]);

  const { data: balanceData } = useReadContracts({
    contracts: tokensToRead.map((addr) => ({
      address: addr,
      abi: BALANCE_OF_ABI,
      functionName: 'balanceOf' as const,
      args: [CLIENT_REWARDS_ADDRESS],
    })),
    query: { enabled: tokensToRead.length > 0, staleTime: 30 * 1000 },
  });

  const balanceMap = useMemo(() => {
    const m = new Map<string, bigint>();
    if (!balanceData) return m;
    tokensToRead.forEach((addr, i) => {
      const r = balanceData[i];
      if (r?.status === 'success') {
        m.set(addr.toLowerCase(), r.result as bigint);
      }
    });
    return m;
  }, [tokensToRead, balanceData]);

  // For the currently selected token, also resolve symbol + decimals if it's
  // a custom address (not in the quick-pick list). Quick-pick tokens already
  // have known metadata.
  const isQuickPickSelected =
    selectedToken.address &&
    quickPickTokens.some(
      (t) => t.address.toLowerCase() === selectedToken.address!.toLowerCase(),
    );
  const customAddressForMeta =
    !isQuickPickSelected &&
    selectedToken.address &&
    isAddress(selectedToken.address)
      ? (selectedToken.address as Address)
      : undefined;
  const { data: customMetaData } = useReadContracts({
    contracts: customAddressForMeta
      ? [
          {
            address: customAddressForMeta,
            abi: MINIMAL_ERC20_ABI,
            functionName: 'symbol' as const,
          },
          {
            address: customAddressForMeta,
            abi: MINIMAL_ERC20_ABI,
            functionName: 'decimals' as const,
          },
        ]
      : [],
    query: { enabled: !!customAddressForMeta, staleTime: 5 * 60 * 1000 },
  });
  const customSymbol =
    customMetaData?.[0]?.status === 'success'
      ? (customMetaData[0].result as string)
      : undefined;
  const customDecimals =
    customMetaData?.[1]?.status === 'success'
      ? Number(customMetaData[1].result as number)
      : undefined;

  // Once metadata resolves for a custom-pasted token, persist the resolved
  // symbol + decimals back into the field JSON so the generator scales
  // amounts correctly.
  useEffect(() => {
    if (!customAddressForMeta) return;
    if (!customSymbol || customDecimals === undefined) return;
    if (
      selectedToken.symbol === customSymbol &&
      selectedToken.decimals === customDecimals
    ) {
      return;
    }
    onUpdateField(
      'token',
      serialiseToken({
        symbol: customSymbol,
        address: customAddressForMeta,
        decimals: customDecimals,
      }),
    );
  }, [
    customAddressForMeta,
    customSymbol,
    customDecimals,
    selectedToken.symbol,
    selectedToken.decimals,
    onUpdateField,
  ]);

  const selectedBalance =
    selectedToken.address &&
    !selectedToken.isNative &&
    isAddress(selectedToken.address)
      ? balanceMap.get(selectedToken.address.toLowerCase())
      : undefined;

  const amountRaw = fieldValues.amount || '';
  const amountBigInt = useMemo(() => {
    if (!amountRaw) return BigInt(0);
    try {
      return parseUnits(amountRaw, selectedToken.decimals);
    } catch {
      return BigInt(0);
    }
  }, [amountRaw, selectedToken.decimals]);

  const exceedsBalance =
    selectedBalance !== undefined &&
    amountBigInt > selectedBalance &&
    amountBigInt > BigInt(0);

  const setMax = () => {
    if (selectedBalance === undefined) return;
    onUpdateField('amount', formatUnits(selectedBalance, selectedToken.decimals));
  };

  const pickToken = (t: CommonRewardToken) => {
    onUpdateField(
      'token',
      serialiseToken({ symbol: t.symbol, address: t.address, decimals: t.decimals }),
    );
  };
  const pickCustomAddress = (addr: string) => {
    if (!addr) {
      onUpdateField('token', '');
      return;
    }
    // We'll resolve symbol/decimals lazily via the metadata effect above;
    // for now stash the address with a placeholder so the picker UI knows
    // a custom token is selected.
    onUpdateField(
      'token',
      serialiseToken({ symbol: '', address: addr, decimals: 18 }),
    );
  };

  const recipientIsTreasury = isTreasuryAddress(fieldValues.recipient);
  const customAddressShown =
    selectedToken.address && !isQuickPickSelected
      ? selectedToken.address
      : '';

  return (
    <div className={editorStyles.templateForm}>
      {/* Context banner — ClientRewards contract address + role */}
      <div className={styles.contextBanner}>
        <div className={styles.contextLabel}>
          ClientRewards · {CLIENT_REWARDS_ADDRESS.slice(0, 6)}…
          {CLIENT_REWARDS_ADDRESS.slice(-4)}
        </div>
        <div className={styles.contextDesc}>
          Withdraws an ERC-20 the ClientRewards contract holds (auction-client
          reward escrow, accidental sends, retired tokens) to a destination.
          All balances shown here are the <strong>contract&rsquo;s</strong>{' '}
          balance — not the treasury&rsquo;s.
        </div>
      </div>

      {/* Token quick-pick chips */}
      <div className={editorStyles.inputGroup}>
        <label className={editorStyles.label}>
          Token<span className={editorStyles.required}>*</span>
        </label>
        <div className={styles.tokenChipRow}>
          {quickPickTokens.map((t) => {
            const balance = balanceMap.get(t.address.toLowerCase());
            const active =
              selectedToken.address?.toLowerCase() === t.address.toLowerCase();
            return (
              <button
                key={t.address}
                type="button"
                className={`${styles.tokenChip} ${active ? styles.tokenChipActive : ''}`}
                onClick={() => pickToken(t)}
                disabled={disabled}
                title={t.hint}
              >
                <span className={styles.tokenChipSymbol}>{t.symbol}</span>
                <span className={styles.tokenChipBalance}>
                  {balance !== undefined
                    ? formatBalance(balance, t.decimals)
                    : '…'}
                </span>
              </button>
            );
          })}
        </div>
        <div className={editorStyles.helpText}>
          Or paste a custom token address below.
        </div>
        <AddressInput
          value={customAddressShown}
          onChange={pickCustomAddress}
          placeholder="0x... custom ERC-20 the contract holds"
          disabled={disabled}
        />
        {customAddressForMeta && (
          <div className={styles.balanceLine}>
            <span className={styles.balanceLabel}>
              {customSymbol
                ? `${customSymbol} balance on ClientRewards:`
                : 'Resolving token metadata…'}
            </span>
            <span className={styles.balanceValue}>
              {selectedBalance !== undefined && customDecimals !== undefined
                ? `${formatBalance(selectedBalance, customDecimals)} ${customSymbol || ''}`
                : '…'}
            </span>
          </div>
        )}
      </div>

      {/* Recipient */}
      <div className={editorStyles.inputGroup}>
        <div className={styles.roleHeader}>
          <label className={editorStyles.label}>
            Recipient<span className={editorStyles.required}>*</span>
          </label>
          {recipientIsTreasury ? (
            <span className={styles.treasuryChipActive}>● Nouns Treasury</span>
          ) : (
            <button
              type="button"
              className={styles.resetTreasuryBtn}
              onClick={() => onUpdateField('recipient', TREASURY_ADDRESS)}
              disabled={disabled}
            >
              Use Treasury
            </button>
          )}
        </div>
        <AddressInput
          value={fieldValues.recipient || ''}
          onChange={(v) => onUpdateField('recipient', v)}
          placeholder="0x... or name.eth"
          disabled={disabled}
        />
        <div className={editorStyles.helpText}>
          Where the swept tokens go. Defaults to the Nouns treasury — change
          only if you have a specific destination.
        </div>
      </div>

      {/* Amount */}
      <div className={editorStyles.inputGroup}>
        <div className={styles.amountHeader}>
          <label className={editorStyles.label}>
            Amount<span className={editorStyles.required}>*</span>
          </label>
          {selectedBalance !== undefined && selectedToken.symbol && (
            <button
              type="button"
              className={styles.maxBtn}
              onClick={setMax}
              disabled={disabled || selectedBalance === BigInt(0)}
            >
              Max: {formatBalance(selectedBalance, selectedToken.decimals)}{' '}
              {selectedToken.symbol}
            </button>
          )}
        </div>
        <input
          className={editorStyles.input}
          type="text"
          inputMode="decimal"
          placeholder="0.0"
          value={amountRaw}
          onChange={(e) => onUpdateField('amount', e.target.value)}
          disabled={disabled}
        />
        {exceedsBalance && (
          <div className={editorStyles.error}>
            Amount exceeds the ClientRewards contract&rsquo;s{' '}
            {selectedToken.symbol || 'token'} balance — the call will revert
          </div>
        )}
        {selectedBalance === BigInt(0) &&
          selectedToken.address &&
          !exceedsBalance && (
            <div className={editorStyles.helpText}>
              Contract holds 0 of this token — nothing to withdraw.
            </div>
          )}
      </div>
    </div>
  );
}
