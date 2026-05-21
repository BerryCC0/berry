/**
 * OctantVaultActionEditor
 * Shared editor for the 3 ERC-4626 templates against a deployed Octant vault:
 *   - octant-vault-deposit  (approve + deposit)
 *   - octant-vault-redeem   (by share count)
 *   - octant-vault-withdraw (by underlying-asset amount)
 *
 * Flow:
 *  1. User pastes the deployed Octant vault address
 *  2. Editor reads vault.asset() / vault.decimals() / vault.symbol() in
 *     parallel and renders an info card
 *  3. For deposit: the underlying token field is auto-filled from asset()
 *     and the treasury's balance of the asset is surfaced with a "Max" button
 *  4. For redeem: treasury's share balance is surfaced
 *  5. For withdraw: treasury's underlying-asset balance is surfaced
 *
 * No more pasting the asset address by hand or matching decimals.
 */

'use client';

import { useEffect, useMemo } from 'react';
import { formatUnits, isAddress, parseUnits, type Address } from 'viem';
import { useReadContracts } from 'wagmi';
import type {
  ActionTemplateType,
  TemplateFieldValues,
} from '../../utils/actionTemplates';
import {
  COMMON_TOKENS,
  MINIMAL_ERC20_ABI,
  TREASURY_ADDRESS,
} from '../../utils/actionTemplates/constants';
import { useTreasuryOctantVaults } from '../../hooks/useTreasuryOctantVaults';
import { AddressInput } from './AddressInput';
import { OctantSimulateButton } from './OctantSimulateButton';
import editorStyles from './ActionTemplateEditor.module.css';
import styles from './OctantVaultActionEditor.module.css';

// ERC-4626 fragments needed for vault metadata reads
const VAULT_ABI = [
  {
    name: 'asset',
    type: 'function',
    stateMutability: 'view',
    inputs: [],
    outputs: [{ type: 'address' }],
  },
  {
    name: 'symbol',
    type: 'function',
    stateMutability: 'view',
    inputs: [],
    outputs: [{ type: 'string' }],
  },
  {
    name: 'name',
    type: 'function',
    stateMutability: 'view',
    inputs: [],
    outputs: [{ type: 'string' }],
  },
  {
    name: 'decimals',
    type: 'function',
    stateMutability: 'view',
    inputs: [],
    outputs: [{ type: 'uint8' }],
  },
  {
    name: 'balanceOf',
    type: 'function',
    stateMutability: 'view',
    inputs: [{ type: 'address' }],
    outputs: [{ type: 'uint256' }],
  },
  {
    name: 'previewDeposit',
    type: 'function',
    stateMutability: 'view',
    inputs: [{ type: 'uint256' }],
    outputs: [{ type: 'uint256' }],
  },
  {
    name: 'previewRedeem',
    type: 'function',
    stateMutability: 'view',
    inputs: [{ type: 'uint256' }],
    outputs: [{ type: 'uint256' }],
  },
  {
    name: 'previewWithdraw',
    type: 'function',
    stateMutability: 'view',
    inputs: [{ type: 'uint256' }],
    outputs: [{ type: 'uint256' }],
  },
  {
    name: 'totalAssets',
    type: 'function',
    stateMutability: 'view',
    inputs: [],
    outputs: [{ type: 'uint256' }],
  },
  {
    name: 'dragonRouter',
    type: 'function',
    stateMutability: 'view',
    inputs: [],
    outputs: [{ type: 'address' }],
  },
  {
    name: 'lastReport',
    type: 'function',
    stateMutability: 'view',
    inputs: [],
    outputs: [{ type: 'uint256' }],
  },
  {
    name: 'pricePerShare',
    type: 'function',
    stateMutability: 'view',
    inputs: [],
    outputs: [{ type: 'uint256' }],
  },
] as const;

function relativeTime(unixSeconds: bigint): string {
  const now = Math.floor(Date.now() / 1000);
  const diff = now - Number(unixSeconds);
  if (diff < 0) return 'in the future';
  if (diff < 60) return `${diff}s ago`;
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
  if (diff < 86400 * 30) return `${Math.floor(diff / 86400)}d ago`;
  if (diff < 86400 * 365)
    return `${Math.floor(diff / (86400 * 30))}mo ago`;
  return `${Math.floor(diff / (86400 * 365))}y ago`;
}

interface OctantVaultActionEditorProps {
  templateId: ActionTemplateType; // octant-vault-deposit | redeem | withdraw
  fieldValues: TemplateFieldValues;
  onUpdateField: (field: string, value: string) => void;
  disabled?: boolean;
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

export function OctantVaultActionEditor({
  templateId,
  fieldValues,
  onUpdateField,
  disabled = false,
}: OctantVaultActionEditorProps) {
  const isDeposit = templateId === 'octant-vault-deposit';
  const isRedeem = templateId === 'octant-vault-redeem';
  const isWithdraw = templateId === 'octant-vault-withdraw';

  const vaultAddress = (fieldValues.vault || '').trim();
  const vaultValid = isAddress(vaultAddress);

  // Discover Octant vaults already deployed by the treasury — surfaced as a
  // picker so users don't have to copy-paste addresses.
  const { vaults: discoveredVaults, isLoading: discoveryLoading } =
    useTreasuryOctantVaults();

  // Parallel reads: asset / symbol / name / decimals / treasury share balance
  // / totalAssets / dragonRouter / lastReport / pricePerShare. All from the
  // same vault contract — one network round-trip via multicall.
  const { data: vaultData, isLoading: vaultLoading } = useReadContracts({
    contracts: vaultValid
      ? [
          { address: vaultAddress as Address, abi: VAULT_ABI, functionName: 'asset' as const },
          { address: vaultAddress as Address, abi: VAULT_ABI, functionName: 'symbol' as const },
          { address: vaultAddress as Address, abi: VAULT_ABI, functionName: 'name' as const },
          { address: vaultAddress as Address, abi: VAULT_ABI, functionName: 'decimals' as const },
          {
            address: vaultAddress as Address,
            abi: VAULT_ABI,
            functionName: 'balanceOf' as const,
            args: [TREASURY_ADDRESS],
          },
          { address: vaultAddress as Address, abi: VAULT_ABI, functionName: 'totalAssets' as const },
          { address: vaultAddress as Address, abi: VAULT_ABI, functionName: 'dragonRouter' as const },
          { address: vaultAddress as Address, abi: VAULT_ABI, functionName: 'lastReport' as const },
          { address: vaultAddress as Address, abi: VAULT_ABI, functionName: 'pricePerShare' as const },
        ]
      : [],
    query: { enabled: vaultValid, staleTime: 60 * 1000 },
  });

  const vaultAsset =
    vaultData?.[0]?.status === 'success'
      ? (vaultData[0].result as string).toLowerCase()
      : undefined;
  const vaultSymbol =
    vaultData?.[1]?.status === 'success'
      ? (vaultData[1].result as string)
      : undefined;
  const vaultName =
    vaultData?.[2]?.status === 'success'
      ? (vaultData[2].result as string)
      : undefined;
  const vaultDecimals =
    vaultData?.[3]?.status === 'success'
      ? Number(vaultData[3].result as number)
      : undefined;
  const treasuryShareBalance =
    vaultData?.[4]?.status === 'success'
      ? (vaultData[4].result as bigint)
      : undefined;
  const totalAssets =
    vaultData?.[5]?.status === 'success'
      ? (vaultData[5].result as bigint)
      : undefined;
  const dragonRouter =
    vaultData?.[6]?.status === 'success'
      ? (vaultData[6].result as string)
      : undefined;
  const lastReport =
    vaultData?.[7]?.status === 'success'
      ? (vaultData[7].result as bigint)
      : undefined;
  const pricePerShare =
    vaultData?.[8]?.status === 'success'
      ? (vaultData[8].result as bigint)
      : undefined;

  // Parallel reads on the underlying asset: symbol, decimals, treasury balance
  const { data: assetData } = useReadContracts({
    contracts: vaultAsset
      ? [
          { address: vaultAsset as Address, abi: MINIMAL_ERC20_ABI, functionName: 'symbol' as const },
          { address: vaultAsset as Address, abi: MINIMAL_ERC20_ABI, functionName: 'decimals' as const },
          {
            address: vaultAsset as Address,
            abi: [
              {
                name: 'balanceOf',
                type: 'function',
                stateMutability: 'view',
                inputs: [{ type: 'address' }],
                outputs: [{ type: 'uint256' }],
              },
            ] as const,
            functionName: 'balanceOf' as const,
            args: [TREASURY_ADDRESS],
          },
        ]
      : [],
    query: { enabled: !!vaultAsset, staleTime: 60 * 1000 },
  });

  const assetSymbol =
    assetData?.[0]?.status === 'success'
      ? (assetData[0].result as string)
      : undefined;
  const assetDecimalsOnchain =
    assetData?.[1]?.status === 'success'
      ? Number(assetData[1].result as number)
      : undefined;
  const treasuryAssetBalance =
    assetData?.[2]?.status === 'success'
      ? (assetData[2].result as bigint)
      : undefined;

  // Fall back to the known-tokens registry when the asset is one we already
  // know about — saves the user from waiting on the on-chain read on first load.
  const known = useMemo(
    () =>
      vaultAsset
        ? COMMON_TOKENS.find((t) => t.address.toLowerCase() === vaultAsset)
        : undefined,
    [vaultAsset],
  );
  const resolvedAssetSymbol = assetSymbol || known?.symbol;
  const resolvedAssetDecimals = assetDecimalsOnchain ?? known?.decimals ?? 18;

  // Deposit / withdraw: keep the template's `token` field in sync with the
  // resolved vault asset so the generator's existing `resolveTokenField`
  // pipeline can scale the amount correctly without manual picking.
  useEffect(() => {
    if (!isDeposit && !isWithdraw) return;
    if (!vaultAsset || !resolvedAssetSymbol) return;
    const payload = JSON.stringify({
      symbol: resolvedAssetSymbol,
      address: vaultAsset,
      decimals: resolvedAssetDecimals,
      isNative: false,
    });
    if (fieldValues.token !== payload) onUpdateField('token', payload);
  }, [
    isDeposit,
    isWithdraw,
    vaultAsset,
    resolvedAssetSymbol,
    resolvedAssetDecimals,
    fieldValues.token,
    onUpdateField,
  ]);

  // Amount field name + decimals differ per template
  const amountField: 'amount' | 'shares' = isRedeem ? 'shares' : 'amount';
  const amountDecimals = isRedeem
    ? (vaultDecimals ?? 18)
    : resolvedAssetDecimals;
  const amountUnitLabel = isRedeem
    ? vaultSymbol || 'shares'
    : resolvedAssetSymbol || 'tokens';

  const treasuryBalance = isRedeem ? treasuryShareBalance : treasuryAssetBalance;
  const treasuryBalanceFormatted =
    treasuryBalance !== undefined
      ? formatBalance(treasuryBalance, amountDecimals)
      : undefined;

  const setMax = () => {
    if (treasuryBalance === undefined) return;
    onUpdateField(
      amountField,
      formatUnits(treasuryBalance, amountDecimals),
    );
  };

  const amountValue = fieldValues[amountField] || '';
  const amountBigInt = useMemo(() => {
    if (!amountValue) return BigInt(0);
    try {
      return parseUnits(amountValue, amountDecimals);
    } catch {
      return BigInt(0);
    }
  }, [amountValue, amountDecimals]);

  const exceedsBalance =
    treasuryBalance !== undefined &&
    amountBigInt > treasuryBalance &&
    amountBigInt > BigInt(0);

  // Preview the trade — previewDeposit/previewRedeem/previewWithdraw all live
  // on the vault and account for any deposit/withdraw fees the strategy charges.
  const previewFn: 'previewDeposit' | 'previewRedeem' | 'previewWithdraw' =
    isDeposit ? 'previewDeposit' : isRedeem ? 'previewRedeem' : 'previewWithdraw';
  const { data: previewData } = useReadContracts({
    contracts:
      vaultValid && amountBigInt > BigInt(0)
        ? [
            {
              address: vaultAddress as Address,
              abi: VAULT_ABI,
              functionName: previewFn,
              args: [amountBigInt],
            },
          ]
        : [],
    query: {
      enabled: vaultValid && amountBigInt > BigInt(0),
      staleTime: 30 * 1000,
    },
  });
  const previewResult =
    previewData?.[0]?.status === 'success'
      ? (previewData[0].result as bigint)
      : undefined;

  // Render the preview line per action type
  let previewLine: string | undefined;
  if (previewResult !== undefined) {
    if (isDeposit) {
      const sharesOut = formatBalance(previewResult, vaultDecimals ?? 18);
      previewLine = `Treasury will receive ~${sharesOut} ${vaultSymbol || 'shares'}`;
    } else if (isRedeem) {
      const assetsOut = formatBalance(previewResult, resolvedAssetDecimals);
      previewLine = `Treasury will receive ~${assetsOut} ${resolvedAssetSymbol || 'tokens'}`;
    } else if (isWithdraw) {
      const sharesBurned = formatBalance(previewResult, vaultDecimals ?? 18);
      previewLine = `~${sharesBurned} ${vaultSymbol || 'shares'} will be burned to satisfy this withdraw`;
    }
  }

  // Asset-mismatch guard: if the user manually changed the `token` field
  // to something other than `vault.asset()`, the deposit/withdraw would
  // revert. Surface a clear error before the proposal even submits.
  let tokenMismatch: string | undefined;
  if ((isDeposit || isWithdraw) && vaultAsset && fieldValues.token) {
    try {
      const parsed = JSON.parse(fieldValues.token);
      const picked = (parsed.address as string | undefined)?.toLowerCase();
      if (picked && picked !== vaultAsset) {
        tokenMismatch = `Vault expects ${resolvedAssetSymbol || 'a different asset'} — switch the underlying field to match or the transaction will revert`;
      }
    } catch {
      // token field isn't JSON yet — ignore until it is
    }
  }

  return (
    <div className={editorStyles.templateForm}>
      {/* Vault picker — shows treasury's deployed Octant vaults */}
      {discoveredVaults.length > 0 && (
        <div className={editorStyles.inputGroup}>
          <label className={editorStyles.label}>
            Pick from Treasury&rsquo;s Octant vaults
          </label>
          <select
            className={editorStyles.select}
            value={
              discoveredVaults.find(
                (v) => v.address.toLowerCase() === vaultAddress.toLowerCase(),
              )?.address || ''
            }
            onChange={(e) => onUpdateField('vault', e.target.value)}
            disabled={disabled}
          >
            <option value="">— Pick a deployed vault —</option>
            {discoveredVaults.map((v) => (
              <option key={v.address} value={v.address}>
                {v.name} · {v.factorySource}
              </option>
            ))}
          </select>
          <div className={editorStyles.helpText}>
            Discovered by scanning <code>StrategyDeploy</code> events across
            the 4 Octant factories. Cached for 5 min. Or paste a vault
            address below.
          </div>
        </div>
      )}

      {/* Vault address */}
      <div className={editorStyles.inputGroup}>
        <label className={editorStyles.label}>
          Vault Address<span className={editorStyles.required}>*</span>
        </label>
        <AddressInput
          value={vaultAddress}
          onChange={(v) => onUpdateField('vault', v)}
          placeholder={
            discoveryLoading
              ? 'Scanning factories for vaults the treasury deployed…'
              : '0x... a deployed Octant Dragon vault'
          }
          disabled={disabled}
        />
      </div>

      {/* Vault info card */}
      {vaultValid && (
        <div className={styles.vaultCard}>
          {vaultLoading && !vaultName ? (
            <div className={styles.vaultLoading}>Loading vault metadata…</div>
          ) : vaultName || vaultSymbol ? (
            <>
              <div className={styles.vaultCardTitle}>
                {vaultName || vaultSymbol || 'Octant Vault'}
              </div>
              <div className={styles.vaultCardRow}>
                <span className={styles.vaultCardLabel}>Underlying</span>
                <span className={styles.vaultCardValue}>
                  {resolvedAssetSymbol ?? 'resolving…'}
                </span>
              </div>
              <div className={styles.vaultCardRow}>
                <span className={styles.vaultCardLabel}>Vault shares</span>
                <span className={styles.vaultCardValue}>
                  {vaultSymbol || '—'}
                </span>
              </div>
              <div className={styles.vaultCardRow}>
                <span className={styles.vaultCardLabel}>
                  Treasury vault-share balance
                </span>
                <span className={styles.vaultCardValue}>
                  {treasuryShareBalance !== undefined
                    ? `${formatBalance(treasuryShareBalance, vaultDecimals ?? 18)} ${vaultSymbol || 'shares'}`
                    : '—'}
                </span>
              </div>
              {totalAssets !== undefined && (
                <div className={styles.vaultCardRow}>
                  <span className={styles.vaultCardLabel}>TVL</span>
                  <span className={styles.vaultCardValue}>
                    {formatBalance(totalAssets, resolvedAssetDecimals)}{' '}
                    {resolvedAssetSymbol || ''}
                  </span>
                </div>
              )}
              {pricePerShare !== undefined && (
                <div className={styles.vaultCardRow}>
                  <span className={styles.vaultCardLabel}>Price per share</span>
                  <span className={styles.vaultCardValue}>
                    {formatBalance(pricePerShare, vaultDecimals ?? 18)}{' '}
                    {resolvedAssetSymbol || ''} / share
                  </span>
                </div>
              )}
              {dragonRouter && (
                <div className={styles.vaultCardRow}>
                  <span className={styles.vaultCardLabel}>Donation address</span>
                  <span className={styles.vaultCardValue}>
                    {`${dragonRouter.slice(0, 6)}…${dragonRouter.slice(-4)}`}
                  </span>
                </div>
              )}
              {lastReport !== undefined && lastReport > BigInt(0) && (
                <div className={styles.vaultCardRow}>
                  <span className={styles.vaultCardLabel}>Last report</span>
                  <span className={styles.vaultCardValue}>
                    {relativeTime(lastReport)}
                  </span>
                </div>
              )}
              {lastReport === BigInt(0) && (
                <div className={styles.vaultCardRow}>
                  <span className={styles.vaultCardLabel}>Last report</span>
                  <span className={styles.vaultCardValue}>
                    Never — vault has not realised yield yet
                  </span>
                </div>
              )}
            </>
          ) : (
            <div className={styles.vaultLoading}>
              No vault metadata at this address — verify it&rsquo;s a deployed
              Octant strategy.
            </div>
          )}
        </div>
      )}

      {/* Amount field */}
      <div className={editorStyles.inputGroup}>
        <div className={styles.amountHeader}>
          <label className={editorStyles.label}>
            {isRedeem ? 'Shares to Redeem' : isDeposit ? 'Deposit Amount' : 'Asset Amount'}
            <span className={editorStyles.required}>*</span>
          </label>
          {treasuryBalanceFormatted !== undefined && (
            <button
              type="button"
              className={styles.maxBtn}
              onClick={setMax}
              disabled={disabled || treasuryBalance === BigInt(0)}
            >
              Max: {treasuryBalanceFormatted} {amountUnitLabel}
            </button>
          )}
        </div>
        <div className={styles.amountInputRow}>
          <input
            className={editorStyles.input}
            type="text"
            inputMode="decimal"
            placeholder="0.0"
            value={amountValue}
            onChange={(e) => onUpdateField(amountField, e.target.value)}
            disabled={disabled}
          />
          <span className={styles.amountUnit}>{amountUnitLabel}</span>
        </div>
        {exceedsBalance && (
          <div className={editorStyles.error}>
            Amount exceeds treasury&rsquo;s {amountUnitLabel} balance
          </div>
        )}
        {tokenMismatch && (
          <div className={editorStyles.error}>{tokenMismatch}</div>
        )}
        {previewLine && (
          <div className={styles.previewLine}>{previewLine}</div>
        )}
        {isDeposit && (
          <div className={editorStyles.helpText}>
            Bundles an ERC-20 <code>approve(vault, amount)</code> followed by{' '}
            <code>vault.deposit(amount, treasury)</code>.
          </div>
        )}
        {isRedeem && (
          <div className={editorStyles.helpText}>
            Burns the specified number of vault shares and returns the
            underlying asset to the treasury.
          </div>
        )}
        {isWithdraw && (
          <div className={editorStyles.helpText}>
            Pulls a specific amount of the underlying asset out of the vault.
            Use Redeem instead to specify shares directly.
          </div>
        )}
      </div>

      <OctantSimulateButton
        templateId={templateId}
        fieldValues={fieldValues}
        disabled={disabled}
      />
    </div>
  );
}
