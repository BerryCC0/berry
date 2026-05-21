/**
 * OctantCreateVaultEditor
 * Shared editor for the 4 Octant Dragon vault factory templates:
 *   - octant-vault-create-lido (wstETH, yield-skimming)
 *   - octant-vault-create-morpho (USDC, yield-donating)
 *   - octant-vault-create-sky (USDS, yield-donating)
 *   - octant-vault-create-yearn (generic Yearn V3 wrapper)
 *
 * Flow:
 *  1. (Yearn only) paste a Yearn V3 vault address; the editor auto-fetches
 *     `vault.asset()` and pre-fills the asset field with its resolved symbol
 *  2. Vault name & symbol (pre-filled, editable)
 *  3. Donation address — the core strategic decision, with a "Use Treasury"
 *     quick-pick + chip indicator
 *  4. Keeper address (required, no default — call ownership decision)
 *  5. Loss-protection toggle (default: enabled)
 *  6. Predicted-address chip — shows where the new vault will deploy
 *  7. Optional "Seed with initial deposit" section: bundles an approve +
 *     deposit into the same proposal so the vault is funded atomically
 *  8. "Advanced" section reveals management / emergency-admin / impl with
 *     treasury pre-fills and a one-tap "Use Treasury" reset.
 */

'use client';

import { useEffect, useMemo, useState } from 'react';
import { formatUnits, isAddress, parseUnits, type Address } from 'viem';
import { useReadContracts } from 'wagmi';
import type {
  ActionTemplateType,
  TemplateFieldValues,
} from '../../utils/actionTemplates';
import {
  EXTERNAL_CONTRACTS,
  OCTANT_LIDO_FACTORY_ADDRESS,
  OCTANT_MORPHO_FACTORY_ADDRESS,
  OCTANT_SKY_FACTORY_ADDRESS,
  OCTANT_YEARN_FACTORY_ADDRESS,
  OCTANT_MORPHO_YS_USDC_ADDRESS,
  OCTANT_SKY_USDS_REWARD_ADDRESS,
  OCTANT_YIELD_DONATING_STRATEGY_ADDRESS,
  OCTANT_YIELD_SKIMMING_STRATEGY_ADDRESS,
  TREASURY_ADDRESS,
  USDS_ADDRESS,
  WSTETH_ADDRESS,
} from '../../utils/actionTemplates/constants';
import { useTokenMetadata } from '../../hooks/useTokenMetadata';
import { useOctantPredictedVault } from '../../hooks/useOctantPredictedVault';
import { useOctantPredictedSplitter } from '../../hooks/useOctantPredictedSplitter';
import { AddressInput } from './AddressInput';
import { OctantSimulateButton } from './OctantSimulateButton';
import editorStyles from './ActionTemplateEditor.module.css';
import styles from './OctantCreateVaultEditor.module.css';

const ASSET_ABI = [
  {
    name: 'asset',
    type: 'function',
    stateMutability: 'view',
    inputs: [],
    outputs: [{ type: 'address' }],
  },
] as const;

const BALANCE_OF_ABI = [
  {
    name: 'balanceOf',
    type: 'function',
    stateMutability: 'view',
    inputs: [{ type: 'address' }],
    outputs: [{ type: 'uint256' }],
  },
] as const;

interface OctantCreateVaultEditorProps {
  templateId: ActionTemplateType;
  fieldValues: TemplateFieldValues;
  onUpdateField: (field: string, value: string) => void;
  disabled?: boolean;
}

interface FactoryMeta {
  factory: Address;
  vaultConstant?: Address;
  assetSymbol: string;
  assetAddress?: Address; // undefined for Yearn — user-supplied
  assetDecimals: number;
  yieldMode: 'skimming' | 'donating';
  impl: Address;
  description: string;
}

const FACTORY_META: Record<string, FactoryMeta> = {
  'octant-vault-create-lido': {
    factory: OCTANT_LIDO_FACTORY_ADDRESS,
    vaultConstant: WSTETH_ADDRESS,
    assetSymbol: 'wstETH',
    assetAddress: WSTETH_ADDRESS,
    assetDecimals: 18,
    yieldMode: 'skimming',
    impl: OCTANT_YIELD_SKIMMING_STRATEGY_ADDRESS,
    description:
      'Yield-skimming vault: appreciation of wstETH (vs ETH) is the donated yield',
  },
  'octant-vault-create-morpho': {
    factory: OCTANT_MORPHO_FACTORY_ADDRESS,
    vaultConstant: OCTANT_MORPHO_YS_USDC_ADDRESS,
    assetSymbol: 'USDC',
    assetAddress: EXTERNAL_CONTRACTS.USDC.address,
    assetDecimals: 6,
    yieldMode: 'donating',
    impl: OCTANT_YIELD_DONATING_STRATEGY_ADDRESS,
    description:
      'Yield-donating vault: USDC is compounded through Morpho and realized yield is donated',
  },
  'octant-vault-create-sky': {
    factory: OCTANT_SKY_FACTORY_ADDRESS,
    vaultConstant: OCTANT_SKY_USDS_REWARD_ADDRESS,
    assetSymbol: 'USDS',
    assetAddress: USDS_ADDRESS,
    assetDecimals: 18,
    yieldMode: 'donating',
    impl: OCTANT_YIELD_DONATING_STRATEGY_ADDRESS,
    description:
      'Yield-donating vault: USDS staking rewards are the donated yield',
  },
  'octant-vault-create-yearn': {
    factory: OCTANT_YEARN_FACTORY_ADDRESS,
    assetSymbol: 'Yearn V3 asset',
    assetDecimals: 18,
    yieldMode: 'donating',
    impl: OCTANT_YIELD_DONATING_STRATEGY_ADDRESS,
    description:
      'Yield-donating vault: any Yearn V3 vault — the underlying must match the asset field',
  },
};

function isTreasuryAddress(addr: string | undefined): boolean {
  if (!addr) return false;
  return addr.toLowerCase() === TREASURY_ADDRESS.toLowerCase();
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

export function OctantCreateVaultEditor({
  templateId,
  fieldValues,
  onUpdateField,
  disabled = false,
}: OctantCreateVaultEditorProps) {
  const isYearn = templateId === 'octant-vault-create-yearn';
  const meta =
    FACTORY_META[templateId] || FACTORY_META['octant-vault-create-lido'];

  const [advancedOpen, setAdvancedOpen] = useState(false);
  const [seedOpen, setSeedOpen] = useState(false);

  // Splitter sub-flow: when the user toggles "Deploy new PaymentSplitter",
  // the editor renders payee/name/share rows, predicts the splitter address,
  // writes it into the donation field, and serialises the form into the
  // hidden `newSplitterPayload` field the generator reads. Empty initial
  // state is parsed from the existing payload if the user previously toggled
  // it on (round-trip support).
  interface SplitterRow { address: string; name: string; shares: string }
  const initialSplitterRows: SplitterRow[] = useMemo(() => {
    if (!fieldValues.newSplitterPayload) return [];
    try {
      const p = JSON.parse(fieldValues.newSplitterPayload) as {
        payees: string[]; names: string[]; shares: string[];
      };
      if (!Array.isArray(p.payees)) return [];
      return p.payees.map((address, i) => ({
        address,
        name: p.names[i] || '',
        shares: p.shares[i] || '',
      }));
    } catch {
      return [];
    }
    // Only read the initial value — local state owns it from then on.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  const [splitterOpen, setSplitterOpen] = useState(initialSplitterRows.length > 0);
  const [splitterRows, setSplitterRows] = useState<SplitterRow[]>(
    initialSplitterRows.length > 0
      ? initialSplitterRows
      : [{ address: '', name: '', shares: '' }],
  );

  // ----- Yearn-only: auto-resolve vault.asset() ---------------------------
  const yearnVault = (fieldValues.yearnVault || '').trim();
  const yearnVaultValid = isYearn && isAddress(yearnVault);
  const { data: yearnAssetData } = useReadContracts({
    contracts: yearnVaultValid
      ? [
          {
            address: yearnVault as Address,
            abi: ASSET_ABI,
            functionName: 'asset' as const,
          },
        ]
      : [],
    query: {
      enabled: yearnVaultValid,
      staleTime: 5 * 60 * 1000,
    },
  });
  const resolvedYearnAsset =
    yearnAssetData?.[0]?.status === 'success'
      ? (yearnAssetData[0].result as string).toLowerCase()
      : undefined;

  useEffect(() => {
    if (!isYearn || !resolvedYearnAsset) return;
    const current = (fieldValues.asset || '').toLowerCase();
    if (current === resolvedYearnAsset) return;
    if (current && isAddress(current)) return;
    onUpdateField('asset', resolvedYearnAsset);
  }, [isYearn, resolvedYearnAsset, fieldValues.asset, onUpdateField]);

  // ----- Resolve asset metadata + treasury balance -----------------------
  // For Lido/Morpho/Sky the asset address is known statically. For Yearn it
  // comes from the user (or the auto-resolved `asset()` read above).
  const assetAddressForReads: Address | undefined = isYearn
    ? (fieldValues.asset && isAddress(fieldValues.asset)
        ? (fieldValues.asset as Address)
        : undefined)
    : meta.assetAddress;
  const assetMeta = useTokenMetadata(assetAddressForReads);
  const resolvedAssetDecimals =
    assetMeta.decimals ?? meta.assetDecimals;
  const resolvedAssetSymbol = assetMeta.symbol ?? meta.assetSymbol;

  // Write Yearn's resolved decimals into a hidden field so the generator
  // can scale `seedAmount` correctly without re-reading on the server side.
  useEffect(() => {
    if (!isYearn) return;
    if (typeof assetMeta.decimals !== 'number') return;
    const current = fieldValues.seedAssetDecimals;
    const next = String(assetMeta.decimals);
    if (current !== next) onUpdateField('seedAssetDecimals', next);
  }, [isYearn, assetMeta.decimals, fieldValues.seedAssetDecimals, onUpdateField]);

  // Treasury balance of the underlying asset — surfaces in the seed section
  // so the user can see what they could deposit
  const { data: treasuryAssetData } = useReadContracts({
    contracts: assetAddressForReads
      ? [
          {
            address: assetAddressForReads,
            abi: BALANCE_OF_ABI,
            functionName: 'balanceOf' as const,
            args: [TREASURY_ADDRESS],
          },
        ]
      : [],
    query: { enabled: !!assetAddressForReads, staleTime: 60 * 1000 },
  });
  const treasuryAssetBalance =
    treasuryAssetData?.[0]?.status === 'success'
      ? (treasuryAssetData[0].result as bigint)
      : undefined;

  // ----- Predicted vault address -----------------------------------------
  const enableBurningBool = fieldValues.enableBurning !== 'false';
  const predictionVaultConstant: Address | undefined = isYearn
    ? (yearnVaultValid ? (yearnVault as Address) : undefined)
    : meta.vaultConstant;
  const predictionAsset: Address | undefined = assetAddressForReads;

  // ----- Splitter prediction & payload sync ------------------------------
  const { predictedAddress: predictedSplitter } = useOctantPredictedSplitter(
    splitterOpen ? TREASURY_ADDRESS : undefined,
  );

  // Validate splitter rows: every row must have a valid address + positive
  // shares. Names are optional.
  const validSplitterRows = useMemo(
    () =>
      splitterRows.filter(
        (r) =>
          r.address.startsWith('0x') &&
          r.address.length === 42 &&
          isAddress(r.address) &&
          /^\d+$/.test(r.shares.trim()) &&
          BigInt(r.shares.trim()) > BigInt(0),
      ),
    [splitterRows],
  );
  const splitterReady = splitterOpen && validSplitterRows.length > 0 && !!predictedSplitter;

  // Push the predicted splitter as the donation address whenever the
  // splitter form is active. When the user collapses it, we leave the
  // donation field alone so they can manually pick a different one.
  useEffect(() => {
    if (!splitterReady) return;
    if (!predictedSplitter) return;
    if (fieldValues.donationAddress === predictedSplitter) return;
    onUpdateField('donationAddress', predictedSplitter);
  }, [splitterReady, predictedSplitter, fieldValues.donationAddress, onUpdateField]);

  // Serialise the splitter payload to the hidden field so the generator
  // can emit the createPaymentSplitter action ahead of createStrategy.
  useEffect(() => {
    if (!splitterOpen) {
      if (fieldValues.newSplitterPayload) onUpdateField('newSplitterPayload', '');
      return;
    }
    if (validSplitterRows.length === 0 || !predictedSplitter) {
      if (fieldValues.newSplitterPayload) onUpdateField('newSplitterPayload', '');
      return;
    }
    const payload = JSON.stringify({
      payees: validSplitterRows.map((r) => r.address),
      names: validSplitterRows.map((r) => r.name),
      shares: validSplitterRows.map((r) => r.shares),
      predicted: predictedSplitter,
    });
    if (fieldValues.newSplitterPayload !== payload) {
      onUpdateField('newSplitterPayload', payload);
    }
  }, [
    splitterOpen,
    validSplitterRows,
    predictedSplitter,
    fieldValues.newSplitterPayload,
    onUpdateField,
  ]);

  const totalShares = splitterRows.reduce(
    (acc, r) => acc + (/^\d+$/.test(r.shares) ? BigInt(r.shares) : BigInt(0)),
    BigInt(0),
  );

  const updateSplitterRow = (index: number, patch: Partial<SplitterRow>) => {
    setSplitterRows((prev) =>
      prev.map((r, i) => (i === index ? { ...r, ...patch } : r)),
    );
  };
  const addSplitterRow = () =>
    setSplitterRows((prev) => [...prev, { address: '', name: '', shares: '' }]);
  const removeSplitterRow = (index: number) =>
    setSplitterRows((prev) =>
      prev.length <= 1 ? prev : prev.filter((_, i) => i !== index),
    );

  const { predictedAddress } = useOctantPredictedVault({
    factory: meta.factory,
    vault: predictionVaultConstant,
    asset: predictionAsset,
    name: fieldValues.vaultName || undefined,
    symbol: fieldValues.vaultSymbol || undefined,
    management: (fieldValues.management || TREASURY_ADDRESS) as Address,
    keeper: (fieldValues.keeper && isAddress(fieldValues.keeper)
      ? fieldValues.keeper
      : undefined) as Address | undefined,
    emergencyAdmin: (fieldValues.emergencyAdmin || TREASURY_ADDRESS) as Address,
    donationAddress: (fieldValues.donationAddress &&
    isAddress(fieldValues.donationAddress)
      ? fieldValues.donationAddress
      : undefined) as Address | undefined,
    enableBurning: enableBurningBool,
    tokenizedStrategyAddress: (fieldValues.tokenizedStrategyAddress ||
      meta.impl) as Address,
    deployer: TREASURY_ADDRESS,
  });

  // Sync the predicted address into the hidden field so the generator can
  // emit the bundled approve+deposit at the correct target.
  useEffect(() => {
    if (!predictedAddress) return;
    if (fieldValues.predictedVault === predictedAddress) return;
    onUpdateField('predictedVault', predictedAddress);
  }, [predictedAddress, fieldValues.predictedVault, onUpdateField]);

  // Clear the predicted address if any input that feeds the CREATE2 hash
  // becomes invalid — prevents stale prediction sticking around when the user
  // edits a field that would change the deploy address.
  useEffect(() => {
    if (predictedAddress) return;
    if (!fieldValues.predictedVault) return;
    onUpdateField('predictedVault', '');
  }, [predictedAddress, fieldValues.predictedVault, onUpdateField]);

  // ----- Seed UI helpers --------------------------------------------------
  const seedAmount = fieldValues.seedAmount || '';
  const seedBigInt = useMemo(() => {
    if (!seedAmount) return BigInt(0);
    try {
      return parseUnits(seedAmount, resolvedAssetDecimals);
    } catch {
      return BigInt(0);
    }
  }, [seedAmount, resolvedAssetDecimals]);
  const seedExceedsBalance =
    treasuryAssetBalance !== undefined &&
    seedBigInt > treasuryAssetBalance &&
    seedBigInt > BigInt(0);
  const seedMissingPrediction =
    seedBigInt > BigInt(0) && !predictedAddress;

  const setSeedMax = () => {
    if (treasuryAssetBalance === undefined) return;
    onUpdateField(
      'seedAmount',
      formatUnits(treasuryAssetBalance, resolvedAssetDecimals),
    );
  };

  const burning = enableBurningBool;
  const setBurning = (v: boolean) =>
    onUpdateField('enableBurning', v ? 'true' : 'false');

  return (
    <div className={editorStyles.templateForm}>
      {/* Header banner — factory context */}
      <div className={styles.factoryBanner}>
        <div className={styles.factoryBannerLabel}>
          Octant {meta.yieldMode === 'skimming' ? 'Yield-Skimming' : 'Yield-Donating'} Vault · {meta.assetSymbol}
        </div>
        <div className={styles.factoryBannerDesc}>{meta.description}</div>
      </div>

      {/* Yearn-only: vault + asset */}
      {isYearn && (
        <>
          <div className={editorStyles.inputGroup}>
            <label className={editorStyles.label}>
              Yearn V3 Vault
              <span className={editorStyles.required}>*</span>
            </label>
            <AddressInput
              value={yearnVault}
              onChange={(v) => onUpdateField('yearnVault', v)}
              placeholder="0x... an existing Yearn V3 vault"
              disabled={disabled}
            />
            <div className={editorStyles.helpText}>
              Paste a deployed Yearn V3 vault — the editor reads its `asset()`
              automatically and pre-fills the asset field below.
            </div>
          </div>

          <div className={editorStyles.inputGroup}>
            <label className={editorStyles.label}>
              Asset<span className={editorStyles.required}>*</span>
            </label>
            <AddressInput
              value={fieldValues.asset || ''}
              onChange={(v) => onUpdateField('asset', v)}
              placeholder="0x... the asset the Yearn vault accepts"
              disabled={disabled}
            />
            {assetMeta.symbol && (
              <div className={styles.resolvedChip}>
                Resolved: <strong>{assetMeta.symbol}</strong>
                {typeof assetMeta.decimals === 'number'
                  ? ` · ${assetMeta.decimals}d`
                  : ''}
              </div>
            )}
          </div>
        </>
      )}

      {/* Vault Name + Symbol */}
      <div className={styles.nameSymbolRow}>
        <div className={editorStyles.inputGroup}>
          <label className={editorStyles.label}>
            Vault Name<span className={editorStyles.required}>*</span>
          </label>
          <input
            className={editorStyles.input}
            type="text"
            value={fieldValues.vaultName || ''}
            onChange={(e) => onUpdateField('vaultName', e.target.value)}
            disabled={disabled}
          />
        </div>
        <div className={editorStyles.inputGroup}>
          <label className={editorStyles.label}>
            Symbol<span className={editorStyles.required}>*</span>
          </label>
          <input
            className={editorStyles.input}
            type="text"
            value={fieldValues.vaultSymbol || ''}
            onChange={(e) => onUpdateField('vaultSymbol', e.target.value)}
            disabled={disabled}
          />
        </div>
      </div>

      {/* Donation address — strategic decision */}
      <div className={editorStyles.inputGroup}>
        <div className={styles.roleHeader}>
          <label className={editorStyles.label}>
            Donation Address<span className={editorStyles.required}>*</span>
          </label>
          {splitterReady ? (
            <span className={styles.treasuryChipActive}>
              ● Predicted PaymentSplitter
            </span>
          ) : isTreasuryAddress(fieldValues.donationAddress) ? (
            <span className={styles.treasuryChipActive}>● Nouns Treasury</span>
          ) : (
            <button
              type="button"
              className={styles.resetTreasuryBtn}
              onClick={() => onUpdateField('donationAddress', TREASURY_ADDRESS)}
              disabled={disabled}
            >
              Use Treasury
            </button>
          )}
        </div>
        <AddressInput
          value={fieldValues.donationAddress || ''}
          onChange={(v) => onUpdateField('donationAddress', v)}
          placeholder="0x... PaymentSplitter or Safe"
          disabled={disabled || splitterReady}
        />
        <div className={editorStyles.helpText}>
          Where realized yield routes as vault shares. Typically a PaymentSplitter
          or Safe. Changes after deployment are gated by a strategy-level cooldown.
        </div>
      </div>

      {/* Deploy a new PaymentSplitter as the donation address — atomic bundle */}
      <button
        type="button"
        className={styles.advancedToggle}
        onClick={() => setSplitterOpen((v) => !v)}
        disabled={disabled}
      >
        {splitterOpen ? '▾' : '▸'} Deploy a new PaymentSplitter as the donation
        address (bundles createPaymentSplitter into this proposal)
      </button>
      {splitterOpen && (
        <div className={styles.splitterPanel}>
          <div className={styles.splitterExplain}>
            Bundles{' '}
            <code>PaymentSplitterFactory.createPaymentSplitter(...)</code>{' '}
            ahead of the vault deployment in this proposal. The predicted
            splitter address is auto-fed into the vault&rsquo;s donation field
            so the whole thing executes atomically.
          </div>

          {splitterRows.map((row, i) => (
            <div key={i} className={styles.splitterRow}>
              <AddressInput
                value={row.address}
                onChange={(v) => updateSplitterRow(i, { address: v })}
                placeholder="0x... payee"
                disabled={disabled}
              />
              <input
                className={editorStyles.input}
                type="text"
                placeholder="Name (optional)"
                value={row.name}
                onChange={(e) => updateSplitterRow(i, { name: e.target.value })}
                disabled={disabled}
              />
              <input
                className={editorStyles.input}
                type="text"
                inputMode="numeric"
                placeholder="Shares"
                value={row.shares}
                onChange={(e) => updateSplitterRow(i, { shares: e.target.value })}
                disabled={disabled}
              />
              <button
                type="button"
                className={styles.splitterRemoveBtn}
                onClick={() => removeSplitterRow(i)}
                disabled={disabled || splitterRows.length <= 1}
                title="Remove payee"
              >
                ×
              </button>
            </div>
          ))}

          <button
            type="button"
            className={styles.splitterAddBtn}
            onClick={addSplitterRow}
            disabled={disabled}
          >
            + Add payee
          </button>

          <div className={styles.splitterFooter}>
            <span>
              Total shares: <strong>{totalShares.toString()}</strong>
              {totalShares > BigInt(0) && (
                <>
                  {' '}— payees receive their share of every donation
                  proportionally.
                </>
              )}
            </span>
          </div>

          {predictedSplitter && (
            <div className={styles.predictionBanner}>
              <div className={styles.predictionLabel}>
                Predicted PaymentSplitter Address
              </div>
              <div className={styles.predictionAddress}>{predictedSplitter}</div>
              <div className={styles.predictionHelp}>
                The vault&rsquo;s donation address is locked to this address
                until you collapse this section.
              </div>
            </div>
          )}
        </div>
      )}

      {/* Keeper */}
      <div className={editorStyles.inputGroup}>
        <label className={editorStyles.label}>
          Keeper<span className={editorStyles.required}>*</span>
        </label>
        <AddressInput
          value={fieldValues.keeper || ''}
          onChange={(v) => onUpdateField('keeper', v)}
          placeholder="0x... address that will call report()"
          disabled={disabled}
        />
        <div className={editorStyles.helpText}>
          Calls <code>report()</code> to realize yield and trigger donations.
          If no keeper is configured to call this regularly, no yield is donated.
        </div>
      </div>

      {/* Burning toggle */}
      <div className={editorStyles.inputGroup}>
        <label className={editorStyles.label}>Loss Protection (Burning)</label>
        <div className={styles.toggleRow}>
          <button
            type="button"
            className={`${styles.toggleBtn} ${burning ? styles.toggleBtnActive : ''}`}
            onClick={() => setBurning(true)}
            disabled={disabled}
          >
            Enable burning
          </button>
          <button
            type="button"
            className={`${styles.toggleBtn} ${!burning ? styles.toggleBtnActive : ''}`}
            onClick={() => setBurning(false)}
            disabled={disabled}
          >
            Disable
          </button>
        </div>
        <div className={editorStyles.helpText}>
          When enabled, donation-address shares can be burned to offset losses.
          Only helps while the donation address still holds shares.
        </div>
      </div>

      {/* Predicted address */}
      {predictedAddress && (
        <div className={styles.predictionBanner}>
          <div className={styles.predictionLabel}>Predicted Vault Address</div>
          <div className={styles.predictionAddress}>{predictedAddress}</div>
          <div className={styles.predictionHelp}>
            CREATE2 — this is where the vault will deploy with the parameters
            above. Changing any parameter will move the address.
          </div>
        </div>
      )}

      {/* Seed section */}
      <button
        type="button"
        className={styles.advancedToggle}
        onClick={() => setSeedOpen((v) => !v)}
        disabled={disabled}
      >
        {seedOpen ? '▾' : '▸'} Seed with an initial deposit (optional)
      </button>
      {seedOpen && (
        <div className={styles.seedPanel}>
          <div className={styles.seedExplain}>
            Bundles an approve + deposit of {resolvedAssetSymbol} into the new
            vault. The deposit targets the predicted CREATE2 address — the
            whole proposal executes atomically so the vault is funded the
            moment it deploys.
          </div>
          <div className={editorStyles.inputGroup}>
            <div className={styles.amountHeader}>
              <label className={editorStyles.label}>
                Seed Amount ({resolvedAssetSymbol})
              </label>
              {treasuryAssetBalance !== undefined && (
                <button
                  type="button"
                  className={styles.maxBtn}
                  onClick={setSeedMax}
                  disabled={disabled || treasuryAssetBalance === BigInt(0)}
                >
                  Max: {formatBalance(treasuryAssetBalance, resolvedAssetDecimals)}{' '}
                  {resolvedAssetSymbol}
                </button>
              )}
            </div>
            <input
              className={editorStyles.input}
              type="text"
              inputMode="decimal"
              placeholder="0.0"
              value={seedAmount}
              onChange={(e) => onUpdateField('seedAmount', e.target.value)}
              disabled={disabled}
            />
            {seedExceedsBalance && (
              <div className={editorStyles.error}>
                Amount exceeds treasury&rsquo;s {resolvedAssetSymbol} balance
              </div>
            )}
            {seedMissingPrediction && (
              <div className={editorStyles.error}>
                Waiting on predicted vault address — fill in the fields above
                so the seed deposit knows where to target.
              </div>
            )}
            {seedBigInt > BigInt(0) &&
              !seedExceedsBalance &&
              !seedMissingPrediction && (
                <div className={styles.previewLine}>
                  Treasury will receive ~{seedAmount}{' '}
                  {fieldValues.vaultSymbol || 'vault shares'} (1:1 — vault
                  starts at parity at deployment)
                </div>
              )}
            <div className={editorStyles.helpText}>
              Leave 0 (or empty) to deploy the vault without a seed deposit.
            </div>
          </div>
        </div>
      )}

      {/* Advanced — roles and impl */}
      <button
        type="button"
        className={styles.advancedToggle}
        onClick={() => setAdvancedOpen((v) => !v)}
        disabled={disabled}
      >
        {advancedOpen ? '▾' : '▸'} Advanced — roles & implementation
      </button>

      {advancedOpen && (
        <div className={styles.advancedPanel}>
          <RoleAddressField
            label="Management"
            value={fieldValues.management || ''}
            helpText="Can update configuration and role assignments"
            onUpdate={(v) => onUpdateField('management', v)}
            disabled={disabled}
          />
          <RoleAddressField
            label="Emergency Admin"
            value={fieldValues.emergencyAdmin || ''}
            helpText="Can shut down and unwind the strategy in an emergency"
            onUpdate={(v) => onUpdateField('emergencyAdmin', v)}
            disabled={disabled}
          />

          <div className={editorStyles.inputGroup}>
            <label className={editorStyles.label}>
              Tokenized Strategy Implementation
            </label>
            <AddressInput
              value={fieldValues.tokenizedStrategyAddress || ''}
              onChange={(v) => onUpdateField('tokenizedStrategyAddress', v)}
              placeholder={meta.impl}
              disabled={disabled}
            />
            <div className={editorStyles.helpText}>
              Octant&rsquo;s shared{' '}
              {meta.yieldMode === 'skimming'
                ? 'Yield-Skimming'
                : 'Yield-Donating'}{' '}
              implementation. Pre-filled — only override if instructed by the
              Octant team.
            </div>
          </div>
        </div>
      )}

      {/* Tenderly fork simulation — Octant docs recommend a test cycle before scaling */}
      <OctantSimulateButton
        templateId={templateId}
        fieldValues={fieldValues}
        disabled={disabled}
      />
    </div>
  );
}

function RoleAddressField({
  label,
  value,
  helpText,
  onUpdate,
  disabled,
}: {
  label: string;
  value: string;
  helpText: string;
  onUpdate: (v: string) => void;
  disabled: boolean;
}) {
  const isTreasury = isTreasuryAddress(value);
  return (
    <div className={editorStyles.inputGroup}>
      <div className={styles.roleHeader}>
        <label className={editorStyles.label}>{label}</label>
        {isTreasury ? (
          <span className={styles.treasuryChipActive}>● Nouns Treasury</span>
        ) : (
          <button
            type="button"
            className={styles.resetTreasuryBtn}
            onClick={() => onUpdate(TREASURY_ADDRESS)}
            disabled={disabled}
          >
            Reset to Treasury
          </button>
        )}
      </div>
      <AddressInput
        value={value}
        onChange={onUpdate}
        placeholder={TREASURY_ADDRESS}
        disabled={disabled}
      />
      <div className={editorStyles.helpText}>{helpText}</div>
    </div>
  );
}
