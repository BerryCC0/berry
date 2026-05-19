/**
 * ActionEditorModal
 * Two-step wizard for picking a transaction template and configuring its
 * parameters. Step 1 is the same picker UI used elsewhere; step 2 renders
 * the template's form (or one of the special editors: SmartActionEditor
 * for custom, NounSwapTemplate for noun-swap, MetaProposeEditor for
 * meta-propose). Parent commits the result via `onSave` only when the user
 * clicks "Save action" — closing/cancelling discards in-progress edits.
 */

'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { formatUnits } from 'viem';
import {
  ActionTemplateType,
  ACTION_TEMPLATES,
  getTemplatesByCategory,
  generateActionsFromTemplate,
  type TemplateFieldValues,
} from '../../utils/actionTemplates';
import { COMMON_TOKENS } from '../../utils/actionTemplates/constants';
import type { ActionTemplateState, ValidationError } from '../../utils/types';
import { useActionTemplate } from '../../utils/hooks/useActionTemplate';
import { useTreasuryStreams } from '@/app/lib/nouns/hooks';
import { Select, type SelectOption } from '@/OS/Primitives/Select/Select';
import {
  TemplatePickerView,
  type TemplateGroup,
} from './TemplatePickerView';
import { ActionTemplatePicker } from './ActionTemplatePicker';
import { SmartActionEditor } from './SmartActionEditor';
import { AddressInput } from './AddressInput';
import { NounSwapTemplate } from './NounSwapTemplate';
import { UniswapV3SwapEditor } from './UniswapV3SwapEditor';
import { StreamSelect } from './StreamSelect';
import { TreasuryTokenSelect } from './TreasuryTokenSelect';
import { PredictedStreamAddress } from './PredictedStreamAddress';
import { PayerReservesLine, PayerShortfallWarning } from './PayerBalanceHint';
import { TokenBuyerStatusLine } from './TokenBuyerStatusLine';
import { ArtworkTraitWizard, type TraitType } from './ArtworkTraitWizard';
import editorStyles from './ActionTemplateEditor.module.css';
import styles from './ActionEditorModal.module.css';

/**
 * Map an action template id to the underlying trait type the wizard renders.
 * Used both inside the main editor and the meta-propose inner editor.
 */
function traitTypeForTemplate(id: ActionTemplateType | undefined): TraitType | null {
  switch (id) {
    case 'descriptor-add-trait-head':
      return 'head';
    case 'descriptor-add-trait-body':
      return 'body';
    case 'descriptor-add-trait-accessory':
      return 'accessory';
    case 'descriptor-add-trait-glasses':
      return 'glasses';
    default:
      return null;
  }
}

// Token options for ERC20 transfers — kept colocated since this is the only
// place that renders the form.
const TOKEN_OPTIONS: SelectOption[] = [
  { value: '{"symbol":"USDC","address":"0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48","decimals":6}', label: 'USDC' },
  { value: '{"symbol":"WETH","address":"0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2","decimals":18}', label: 'WETH' },
  { value: '{"symbol":"DAI","address":"0x6B175474E89094C44Da98b954EedeAC495271d0F","decimals":18}', label: 'DAI' },
  { value: '{"symbol":"stETH","address":"0xae7ab96520DE3A18E5e111B5EaAb095312D7fE84","decimals":18}', label: 'stETH' },
  { value: '{"symbol":"wstETH","address":"0x7f39C581F595B53c5cb19bD0b3f8dA6c935E2Ca0","decimals":18}', label: 'wstETH' },
  { value: '{"symbol":"rETH","address":"0xae78736Cd615f374D3085123A210448E74Fc6393","decimals":18}', label: 'rETH' },
];

// Static option groups for the picker. Built once from the template registry.
// `artwork` templates live under the "DAO Admin Functions" tab (alongside
// admin-*) because they're admin-level powers — the picker shows them as a
// dedicated sub-tab inside Admin (see ADMIN_SUBGROUPS in TemplatePickerView).
const OPTION_GROUPS: TemplateGroup[] = (() => {
  const make = (cat: Parameters<typeof getTemplatesByCategory>[0]) =>
    getTemplatesByCategory(cat).map((t) => ({
      value: t.id,
      label: t.name,
      description: t.description,
    }));
  return [
    { label: 'Payments', options: make('payments') },
    { label: 'Streams', options: make('streams') },
    { label: 'Nouns Token', options: make('nouns') },
    { label: 'Delegation', options: make('delegation') },
    { label: 'Token Buyer', options: make('swaps') },
    {
      label: 'Swaps',
      options: [...make('erc20'), ...make('dex')],
    },
    { label: 'Staking', options: make('staking') },
    { label: 'Meta', options: make('meta') },
    {
      label: 'Custom',
      options: [
        {
          value: 'custom',
          label: 'Custom Transaction',
          description: 'Build a custom contract call',
        },
      ],
    },
    {
      label: 'DAO Admin Functions',
      options: [...make('admin'), ...make('artwork')],
    },
  ];
})();

// Shape used for the locally-managed `custom` action while the modal is
// open. Mirrors the on-chain proposal action shape.
interface ProposalAction {
  target: string;
  value: string;
  signature: string;
  calldata: string;
}

// Categories allowed inside the meta-propose inner template picker —
// includes 'meta' for recursive proposalception. Artwork is folded into
// the 'admin' group below (see innerTemplateGroups), so it's not listed
// here as its own tab.
const INNER_TEMPLATE_CATEGORIES = [
  'payments',
  'swaps',
  'erc20',
  'dex',
  'staking',
  'nouns',
  'streams',
  'delegation',
  'admin',
  'meta',
] as const;

// ============================================================================
// MetaProposeEditor — nested editor for the meta-propose template
// ============================================================================

interface MetaProposeEditorProps {
  fieldValues: TemplateFieldValues;
  updateField: (field: string, value: string) => void;
  disabled: boolean;
  validationErrors: ValidationError[];
}

function MetaProposeEditor({
  fieldValues,
  updateField,
  disabled,
  validationErrors,
}: MetaProposeEditorProps) {
  const [innerTemplateId, setInnerTemplateId] = useState<
    ActionTemplateType | ''
  >('');
  const [innerFieldValues, setInnerFieldValues] = useState<TemplateFieldValues>(
    {},
  );

  const innerTemplateGroups: TemplateGroup[] = INNER_TEMPLATE_CATEGORIES.map(
    (category) => {
      const baseOptions = getTemplatesByCategory(category).map((t) => ({
        value: t.id,
        label: t.name,
        description: t.description,
      }));
      // Admin tab pools admin-* + artwork (descriptor-*) so the same admin
      // sub-tabs (incl. Artwork) appear in the meta-propose inner picker too.
      const options =
        category === 'admin'
          ? [
              ...baseOptions,
              ...getTemplatesByCategory('artwork').map((t) => ({
                value: t.id,
                label: t.name,
                description: t.description,
              })),
            ]
          : baseOptions;
      const label =
        category === 'payments'
          ? 'Payments'
          : category === 'swaps'
            ? 'Token Buyer'
            : category === 'erc20'
              ? 'ERC-20 Ops'
              : category === 'dex'
                ? 'DEX Swaps'
                : category === 'staking'
                  ? 'Staking'
                  : category === 'nouns'
                    ? 'Nouns Token'
                    : category === 'streams'
                      ? 'Streams'
                      : category === 'delegation'
                        ? 'Delegation'
                        : category === 'admin'
                          ? 'DAO Admin'
                          : category === 'meta'
                            ? 'Meta (Recursive)'
                            : category;
      return { label, options };
    },
  );
  innerTemplateGroups.push({
    label: 'Custom',
    options: [
      {
        value: 'custom',
        label: 'Custom Transaction',
        description: 'Build a custom contract call',
      },
    ],
  });

  const innerTemplate = innerTemplateId
    ? ACTION_TEMPLATES[innerTemplateId]
    : null;

  const updateInnerAction = useCallback(
    (templateId: ActionTemplateType | '', fields: TemplateFieldValues) => {
      if (!templateId) {
        updateField('innerAction', '');
        return;
      }
      try {
        const actions = generateActionsFromTemplate(templateId, fields);
        updateField('innerAction', JSON.stringify(actions));
      } catch {
        updateField('innerAction', '');
      }
    },
    [updateField],
  );

  const handleInnerTemplateChange = (templateId: string) => {
    const newTemplateId = templateId as ActionTemplateType | '';
    setInnerTemplateId(newTemplateId);
    setInnerFieldValues({});
    updateInnerAction(newTemplateId, {});
  };

  const handleInnerFieldChange = (field: string, value: string) => {
    const newFields = { ...innerFieldValues, [field]: value };
    setInnerFieldValues(newFields);
    if (innerTemplateId) {
      updateInnerAction(innerTemplateId, newFields);
    }
  };

  return (
    <div className={editorStyles.templateForm}>
      <div className={editorStyles.inputGroup}>
        <label className={editorStyles.label}>
          Inner Proposal Title<span className={editorStyles.required}>*</span>
        </label>
        <input
          type="text"
          className={editorStyles.input}
          value={fieldValues.innerTitle || ''}
          onChange={(e) => updateField('innerTitle', e.target.value)}
          placeholder="Title for the proposal that will be created"
          disabled={disabled}
        />
        <div className={editorStyles.helpText}>
          This will be the title of the NEW proposal created when this one
          executes
        </div>
      </div>

      <div className={editorStyles.inputGroup}>
        <label className={editorStyles.label}>
          Inner Proposal Description
          <span className={editorStyles.required}>*</span>
        </label>
        <textarea
          className={editorStyles.textarea}
          value={fieldValues.innerDescription || ''}
          onChange={(e) => updateField('innerDescription', e.target.value)}
          placeholder="Description for the inner proposal"
          disabled={disabled}
          rows={4}
        />
        <div className={editorStyles.helpText}>
          Full description/body of the inner proposal
        </div>
      </div>

      <div className={editorStyles.nestedActionSection}>
        <label className={editorStyles.label}>
          Inner Proposal Action<span className={editorStyles.required}>*</span>
        </label>
        <div
          className={editorStyles.helpText}
          style={{ marginBottom: '8px' }}
        >
          The action the inner proposal will execute when IT passes
        </div>

        <ActionTemplatePicker
          groups={innerTemplateGroups}
          value={innerTemplateId}
          onChange={handleInnerTemplateChange}
          placeholder="Select inner action type..."
          disabled={disabled}
        />

        {innerTemplate?.id === 'meta-propose' && (
          <div className={editorStyles.nestedFields}>
            <MetaProposeEditor
              fieldValues={innerFieldValues}
              updateField={handleInnerFieldChange}
              disabled={disabled}
              validationErrors={[]}
            />
          </div>
        )}

        {innerTemplate &&
          innerTemplate.id !== 'custom' &&
          innerTemplate.id !== 'meta-propose' && (
            <div className={editorStyles.nestedFields}>
              {innerTemplate.fields.map((field) => (
                <div key={field.name} className={editorStyles.inputGroup}>
                  <label className={editorStyles.label}>
                    {field.label}
                    {field.required && (
                      <span className={editorStyles.required}>*</span>
                    )}
                  </label>

                  {field.type === 'select' ? (
                    <select
                      className={editorStyles.select}
                      value={innerFieldValues[field.name] || ''}
                      onChange={(e) =>
                        handleInnerFieldChange(field.name, e.target.value)
                      }
                      disabled={disabled}
                    >
                      {field.options?.map((opt) => (
                        <option key={opt.value} value={opt.value}>
                          {opt.label}
                        </option>
                      ))}
                    </select>
                  ) : field.type === 'address' ? (
                    <AddressInput
                      value={innerFieldValues[field.name] || ''}
                      onChange={(value) =>
                        handleInnerFieldChange(field.name, value)
                      }
                      placeholder={field.placeholder || '0x... or name.eth'}
                      disabled={disabled}
                      helpText={field.helpText}
                    />
                  ) : field.type === 'token-select' ? (
                    <Select
                      options={TOKEN_OPTIONS}
                      value={innerFieldValues[field.name] || ''}
                      onChange={(value) =>
                        handleInnerFieldChange(field.name, value)
                      }
                      placeholder="Select token..."
                      disabled={disabled}
                    />
                  ) : field.type === 'stream-select' ? (
                    <StreamSelect
                      value={innerFieldValues[field.name] || ''}
                      onChange={(value) =>
                        handleInnerFieldChange(field.name, value)
                      }
                      disabled={disabled}
                    />
                  ) : field.type === 'treasury-token-select' ? (
                    <TreasuryTokenSelect
                      value={innerFieldValues[field.name] || ''}
                      onChange={(value) =>
                        handleInnerFieldChange(field.name, value)
                      }
                      disabled={disabled}
                    />
                  ) : field.type === 'treasury-votes-token-select' ? (
                    <TreasuryTokenSelect
                      value={innerFieldValues[field.name] || ''}
                      onChange={(value) =>
                        handleInnerFieldChange(field.name, value)
                      }
                      disabled={disabled}
                      votesOnly
                    />
                  ) : field.type === 'predicted-stream-address' ? (
                    <PredictedStreamAddress
                      value={innerFieldValues[field.name] || ''}
                      onChange={(value) =>
                        handleInnerFieldChange(field.name, value)
                      }
                      fieldValues={innerFieldValues}
                    />
                  ) : field.type === 'artwork-trait' ? (
                    (() => {
                      const tt = traitTypeForTemplate(innerTemplate?.id);
                      if (!tt) return null;
                      return (
                        <ArtworkTraitWizard
                          traitType={tt}
                          value={innerFieldValues[field.name] || ''}
                          onChange={(v) =>
                            handleInnerFieldChange(field.name, v)
                          }
                          disabled={disabled}
                        />
                      );
                    })()
                  ) : (
                    <input
                      type={
                        field.type === 'number' || field.type === 'amount'
                          ? 'number'
                          : 'text'
                      }
                      className={editorStyles.input}
                      value={innerFieldValues[field.name] || ''}
                      onChange={(e) =>
                        handleInnerFieldChange(field.name, e.target.value)
                      }
                      placeholder={field.placeholder}
                      disabled={disabled}
                    />
                  )}

                  {field.helpText && field.type !== 'address' && (
                    <div className={editorStyles.helpText}>{field.helpText}</div>
                  )}
                </div>
              ))}
            </div>
          )}

        {innerTemplate?.id === 'custom' && (
          <div className={editorStyles.nestedFields}>
            <div className={editorStyles.inputGroup}>
              <label className={editorStyles.label}>Target Address</label>
              <AddressInput
                value={innerFieldValues.target || ''}
                onChange={(value) => {
                  const newFields = { ...innerFieldValues, target: value };
                  setInnerFieldValues(newFields);
                  updateField(
                    'innerAction',
                    JSON.stringify([
                      {
                        target: value,
                        value: innerFieldValues.value || '0',
                        signature: innerFieldValues.signature || '',
                        calldata: innerFieldValues.calldata || '0x',
                      },
                    ]),
                  );
                }}
                placeholder="0x..."
                disabled={disabled}
              />
            </div>
            <div className={editorStyles.inputGroup}>
              <label className={editorStyles.label}>ETH Value</label>
              <input
                type="text"
                className={editorStyles.input}
                value={innerFieldValues.value || '0'}
                onChange={(e) => {
                  setInnerFieldValues({
                    ...innerFieldValues,
                    value: e.target.value,
                  });
                  updateField(
                    'innerAction',
                    JSON.stringify([
                      {
                        target: innerFieldValues.target || '',
                        value: e.target.value,
                        signature: innerFieldValues.signature || '',
                        calldata: innerFieldValues.calldata || '0x',
                      },
                    ]),
                  );
                }}
                placeholder="0"
                disabled={disabled}
              />
            </div>
            <div className={editorStyles.inputGroup}>
              <label className={editorStyles.label}>Function Signature</label>
              <input
                type="text"
                className={editorStyles.input}
                value={innerFieldValues.signature || ''}
                onChange={(e) => {
                  setInnerFieldValues({
                    ...innerFieldValues,
                    signature: e.target.value,
                  });
                  updateField(
                    'innerAction',
                    JSON.stringify([
                      {
                        target: innerFieldValues.target || '',
                        value: innerFieldValues.value || '0',
                        signature: e.target.value,
                        calldata: innerFieldValues.calldata || '0x',
                      },
                    ]),
                  );
                }}
                placeholder="e.g., transfer(address,uint256)"
                disabled={disabled}
              />
            </div>
            <div className={editorStyles.inputGroup}>
              <label className={editorStyles.label}>Calldata</label>
              <input
                type="text"
                className={editorStyles.input}
                value={innerFieldValues.calldata || '0x'}
                onChange={(e) => {
                  setInnerFieldValues({
                    ...innerFieldValues,
                    calldata: e.target.value,
                  });
                  updateField(
                    'innerAction',
                    JSON.stringify([
                      {
                        target: innerFieldValues.target || '',
                        value: innerFieldValues.value || '0',
                        signature: innerFieldValues.signature || '',
                        calldata: e.target.value,
                      },
                    ]),
                  );
                }}
                placeholder="0x..."
                disabled={disabled}
              />
            </div>
          </div>
        )}
      </div>

      {validationErrors.find((err) => err.field === 'innerAction') && (
        <div className={editorStyles.error}>
          {validationErrors.find((err) => err.field === 'innerAction')?.message}
        </div>
      )}
    </div>
  );
}

// ============================================================================
// ActionEditorModal — main wizard component
// ============================================================================

interface ActionEditorModalProps {
  initialState: ActionTemplateState;
  onSave: (state: ActionTemplateState) => void;
  onClose: () => void;
  disabled?: boolean;
}

export function ActionEditorModal({
  initialState,
  onSave,
  onClose,
  disabled = false,
}: ActionEditorModalProps) {
  const [step, setStep] = useState<'pick' | 'configure'>(
    initialState.templateId ? 'configure' : 'pick',
  );

  const {
    selectedTemplate,
    fieldValues,
    generatedActions,
    validationErrors,
    setSelectedTemplate,
    updateField,
    resetTemplate,
  } = useActionTemplate();

  // Custom-template state is stored outside the hook (the hook doesn't
  // manage raw target/value/signature/calldata). Seed from initialState.
  const [localCustomAction, setLocalCustomAction] = useState<ProposalAction>(
    () =>
      initialState.templateId === 'custom' && initialState.generatedActions[0]
        ? { ...initialState.generatedActions[0] }
        : { target: '', value: '0', signature: '', calldata: '0x' },
  );

  // Initialize the hook from `initialState` on mount only. Subsequent prop
  // changes are ignored — the modal owns its working copy until Save.
  const initializedRef = useRef(false);
  useEffect(() => {
    if (initializedRef.current) return;
    initializedRef.current = true;
    if (!initialState.templateId) return;

    setSelectedTemplate(initialState.templateId as ActionTemplateType);
    // Field values must land after setSelectedTemplate has registered the
    // template (the hook reads template config when applying values).
    setTimeout(() => {
      Object.entries(initialState.fieldValues).forEach(([k, v]) => {
        if (v) updateField(k, v);
      });
    }, 0);
  }, [initialState, setSelectedTemplate, updateField]);

  // Auto-default recipient / amount / tokenAddress for stream-restream when
  // the user picks a source stream. Lifted from the old inline editor so
  // the behaviour survives the move into the modal.
  const lastRestreamSourceRef = useRef<string | undefined>(undefined);
  const { data: streamsData } = useTreasuryStreams();
  useEffect(() => {
    if (selectedTemplate?.id !== 'stream-restream') {
      lastRestreamSourceRef.current = undefined;
      return;
    }
    const sourceAddr = fieldValues.sourceStreamAddress;
    if (!sourceAddr) {
      lastRestreamSourceRef.current = undefined;
      return;
    }
    if (lastRestreamSourceRef.current === sourceAddr) return;

    const source = streamsData?.streams.find(
      (s) => s.streamAddress.toLowerCase() === sourceAddr.toLowerCase(),
    );
    if (!source) return;

    const tokenMeta = COMMON_TOKENS.find(
      (t) => t.address.toLowerCase() === source.tokenAddress.toLowerCase(),
    );
    const decimals = tokenMeta?.decimals ?? 18;

    updateField(
      'tokenAddress',
      JSON.stringify({
        address: source.tokenAddress,
        symbol: tokenMeta?.symbol || 'TOKEN',
        decimals,
        isNative: false,
      }),
    );
    updateField('recipient', source.recipient);

    const totalRaw = BigInt(source.tokenAmountRaw);
    const ratio = Math.max(0, Math.min(1, source.vestedRatio));
    const ratioScaled = BigInt(Math.round(ratio * 10_000));
    const vestedRaw = (totalRaw * ratioScaled) / BigInt(10_000);
    const unvestedRaw = totalRaw - vestedRaw;
    updateField('amount', formatUnits(unvestedRaw, decimals));

    lastRestreamSourceRef.current = sourceAddr;
  }, [
    selectedTemplate?.id,
    fieldValues.sourceStreamAddress,
    streamsData,
    updateField,
  ]);

  // Escape closes; body scroll lock.
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', handler);
    const orig = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.removeEventListener('keydown', handler);
      document.body.style.overflow = orig;
    };
  }, [onClose]);

  const handlePickTemplate = (id: string) => {
    if (!id) return;
    if (selectedTemplate?.id !== id) {
      resetTemplate();
      if (id !== 'custom') {
        setSelectedTemplate(id as ActionTemplateType);
      } else {
        setSelectedTemplate('custom' as ActionTemplateType);
        // Reset the local custom-action buffer when switching INTO custom.
        setLocalCustomAction({
          target: '',
          value: '0',
          signature: '',
          calldata: '0x',
        });
      }
    }
    setStep('configure');
  };

  const handleSave = () => {
    if (!selectedTemplate) return;
    if (selectedTemplate.id === 'custom') {
      onSave({
        templateId: 'custom',
        fieldValues: {},
        generatedActions: [localCustomAction],
      });
      return;
    }
    onSave({
      templateId: selectedTemplate.id,
      fieldValues,
      generatedActions,
    });
  };

  const handleBackdropClick = (e: React.MouseEvent) => {
    if (e.target === e.currentTarget) onClose();
  };

  const renderConfigure = () => {
    if (!selectedTemplate) return null;

    if (selectedTemplate.id === 'custom') {
      return (
        <div className={styles.formScroll}>
          <SmartActionEditor
            index={0}
            target={localCustomAction.target}
            value={localCustomAction.value}
            signature={localCustomAction.signature}
            calldata={localCustomAction.calldata}
            onUpdate={(field, value) =>
              setLocalCustomAction((prev) => ({ ...prev, [field]: value }))
            }
            disabled={disabled}
          />
        </div>
      );
    }

    if (selectedTemplate.id === 'meta-propose') {
      return (
        <div className={styles.formScroll}>
          <MetaProposeEditor
            fieldValues={fieldValues}
            updateField={updateField}
            disabled={disabled}
            validationErrors={validationErrors}
          />
        </div>
      );
    }

    if (selectedTemplate.id === 'noun-swap') {
      return (
        <div className={styles.formScroll}>
          <NounSwapTemplate
            template={selectedTemplate}
            fieldValues={fieldValues}
            onUpdateField={updateField}
            validationErrors={validationErrors}
            disabled={disabled}
          />
        </div>
      );
    }

    if (selectedTemplate.id === 'swap-uniswap-v3') {
      return (
        <div className={styles.formScroll}>
          <UniswapV3SwapEditor
            fieldValues={fieldValues}
            onUpdateField={updateField}
            disabled={disabled}
          />
        </div>
      );
    }

    return (
      <div className={styles.formScroll}>
        <div className={editorStyles.templateForm}>
          {/* Template-level header for the USDC Payer template */}
          {selectedTemplate.id === 'payment-once' && <PayerReservesLine />}
          {/* TokenBuyer status for the swap-buy-eth template */}
          {selectedTemplate.id === 'swap-buy-eth' && <TokenBuyerStatusLine />}
          {selectedTemplate.fields.map((field) => {
            const tokenSymbolHint =
              field.type === 'amount'
                ? extractTokenSymbol(
                    fieldValues.token || fieldValues.tokenAddress,
                  )
                : null;
            return (
              <div key={field.name} className={editorStyles.inputGroup}>
                <label className={editorStyles.label}>
                  {field.label}
                  {tokenSymbolHint ? ` (${tokenSymbolHint})` : ''}
                  {field.required && (
                    <span className={editorStyles.required}>*</span>
                  )}
                </label>

                {field.type === 'select' ? (
                  <select
                    className={editorStyles.select}
                    value={fieldValues[field.name] || ''}
                    onChange={(e) => updateField(field.name, e.target.value)}
                    disabled={disabled}
                  >
                    {field.options?.map((opt) => (
                      <option key={opt.value} value={opt.value}>
                        {opt.label}
                      </option>
                    ))}
                  </select>
                ) : field.type === 'date' ? (
                  <input
                    type="datetime-local"
                    className={editorStyles.input}
                    value={fieldValues[field.name] || ''}
                    onChange={(e) => updateField(field.name, e.target.value)}
                    disabled={disabled}
                  />
                ) : field.type === 'token-select' ? (
                  <Select
                    options={TOKEN_OPTIONS}
                    value={fieldValues[field.name] || ''}
                    onChange={(value) => updateField(field.name, value)}
                    placeholder="Select token..."
                    disabled={disabled}
                  />
                ) : field.type === 'stream-select' ? (
                  <StreamSelect
                    value={fieldValues[field.name] || ''}
                    onChange={(value) => updateField(field.name, value)}
                    disabled={disabled}
                  />
                ) : field.type === 'treasury-token-select' ? (
                  <TreasuryTokenSelect
                    value={fieldValues[field.name] || ''}
                    onChange={(value) => updateField(field.name, value)}
                    disabled={disabled}
                  />
                ) : field.type === 'treasury-votes-token-select' ? (
                  <TreasuryTokenSelect
                    value={fieldValues[field.name] || ''}
                    onChange={(value) => updateField(field.name, value)}
                    disabled={disabled}
                    votesOnly
                  />
                ) : field.type === 'predicted-stream-address' ? (
                  <PredictedStreamAddress
                    value={fieldValues[field.name] || ''}
                    onChange={(value) => updateField(field.name, value)}
                    fieldValues={fieldValues}
                  />
                ) : field.type === 'artwork-trait' ? (
                  (() => {
                    const tt = traitTypeForTemplate(selectedTemplate.id);
                    if (!tt) return null;
                    return (
                      <ArtworkTraitWizard
                        traitType={tt}
                        value={fieldValues[field.name] || ''}
                        onChange={(v) => updateField(field.name, v)}
                        disabled={disabled}
                      />
                    );
                  })()
                ) : field.type === 'address' ? (
                  <AddressInput
                    value={fieldValues[field.name] || ''}
                    onChange={(value) => updateField(field.name, value)}
                    placeholder={field.placeholder || '0x... or name.eth'}
                    disabled={disabled}
                    helpText={field.helpText}
                  />
                ) : (
                  <input
                    type={field.type === 'number' ? 'number' : 'text'}
                    className={editorStyles.input}
                    value={fieldValues[field.name] || ''}
                    onChange={(e) => updateField(field.name, e.target.value)}
                    placeholder={field.placeholder}
                    disabled={disabled}
                  />
                )}

                {field.helpText && field.type !== 'address' && (
                  <div className={editorStyles.helpText}>{field.helpText}</div>
                )}

                {selectedTemplate.id === 'payment-once' &&
                  field.name === 'amount' && (
                    <PayerShortfallWarning
                      amount={fieldValues[field.name] || ''}
                    />
                  )}

                {validationErrors.find((err) => err.field === field.name) && (
                  <div className={editorStyles.error}>
                    {
                      validationErrors.find((err) => err.field === field.name)
                        ?.message
                    }
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>
    );
  };

  const headerTitle =
    step === 'pick'
      ? 'Select transaction type'
      : selectedTemplate
        ? selectedTemplate.name
        : 'Configure transaction';

  return (
    <div
      className={styles.overlay}
      onClick={handleBackdropClick}
      role="dialog"
      aria-modal="true"
      aria-label="Configure transaction"
    >
      <div className={styles.modal}>
        <div className={styles.modalHeader}>
          {step === 'configure' && (
            <button
              type="button"
              className={styles.backButton}
              onClick={() => setStep('pick')}
              aria-label="Change transaction type"
              title="Change transaction type"
            >
              ‹
            </button>
          )}
          <span className={styles.modalTitle}>{headerTitle}</span>
          <button
            type="button"
            className={styles.closeButton}
            onClick={onClose}
            aria-label="Close"
          >
            ×
          </button>
        </div>

        {step === 'pick' ? (
          <TemplatePickerView
            groups={OPTION_GROUPS}
            value={selectedTemplate?.id || ''}
            // Preserve the tab the user came from when they back out of
            // step 2: derive the category from the currently-selected
            // template so the picker re-mounts on the same tab.
            initialTab={
              selectedTemplate
                ? OPTION_GROUPS.find((g) =>
                    g.options.some((o) => o.value === selectedTemplate.id),
                  )?.label
                : undefined
            }
            onSelect={handlePickTemplate}
          />
        ) : (
          renderConfigure()
        )}

        <div className={styles.modalFooter}>
          <button
            type="button"
            className={styles.cancelButton}
            onClick={onClose}
          >
            Cancel
          </button>
          {step === 'configure' && (
            <button
              type="button"
              className={styles.saveButton}
              onClick={handleSave}
              disabled={!selectedTemplate || disabled}
            >
              Save action
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

/**
 * Pull a token symbol out of a token-picker field's stored value. Field may
 * hold either a raw 0x address (in which case we look it up in known tokens)
 * or a JSON-stringified {symbol, address, decimals, ...} payload.
 */
function extractTokenSymbol(raw: string | undefined): string | null {
  if (!raw) return null;
  try {
    const parsed = JSON.parse(raw);
    if (parsed && typeof parsed.symbol === 'string') return parsed.symbol;
  } catch {
    /* fall through */
  }
  if (raw.startsWith('0x') && raw.length === 42) {
    const match = COMMON_TOKENS.find(
      (t) => t.address.toLowerCase() === raw.toLowerCase(),
    );
    if (match) return match.symbol;
  }
  return null;
}
