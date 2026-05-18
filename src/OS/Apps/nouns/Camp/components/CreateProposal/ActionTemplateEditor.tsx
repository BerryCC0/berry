/**
 * ActionTemplateEditor Component
 * Main editor for creating proposal actions using templates
 */

'use client';

import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  ActionTemplateType,
  ACTION_TEMPLATES,
  getTemplatesByCategory,
  generateActionsFromTemplate,
  type TemplateFieldValues,
} from '../../utils/actionTemplates';
import type { ActionTemplateState, ValidationError } from '../../utils/types';
import { useActionTemplate } from '../../utils/hooks/useActionTemplate';
import { SmartActionEditor } from './SmartActionEditor';
import { ActionTemplateDropdown } from './ActionTemplateDropdown';
import { AddressInput } from './AddressInput';
import { NounSwapTemplate } from './NounSwapTemplate';
import { StreamSelect } from './StreamSelect';
import { TreasuryTokenSelect } from './TreasuryTokenSelect';
import { PredictedStreamAddress } from './PredictedStreamAddress';
import { useDecodedTransactions } from '../../hooks/useDecodedTransactions';
import { useTreasuryStreams } from '@/app/lib/nouns/hooks';
import { formatUnits } from 'viem';
import { COMMON_TOKENS } from '../../utils/actionTemplates/constants';
import {
  AddressWithENS,
  formatGas,
  getTenderlySimulatorUrl,
} from '../SimulationStatus/SimulationStatus';
import type { TransactionResult } from '../../hooks/useSimulation';
import { Select, type SelectOption } from '@/OS/Primitives/Select/Select';
import styles from './ActionTemplateEditor.module.css';

// Token options for ERC20 transfers
const TOKEN_OPTIONS: SelectOption[] = [
  { value: '{"symbol":"USDC","address":"0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48","decimals":6}', label: 'USDC' },
  { value: '{"symbol":"WETH","address":"0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2","decimals":18}', label: 'WETH' },
  { value: '{"symbol":"DAI","address":"0x6B175474E89094C44Da98b954EedeAC495271d0F","decimals":18}', label: 'DAI' },
  { value: '{"symbol":"stETH","address":"0xae7ab96520DE3A18E5e111B5EaAb095312D7fE84","decimals":18}', label: 'stETH' },
  { value: '{"symbol":"wstETH","address":"0x7f39C581F595B53c5cb19bD0b3f8dA6c935E2Ca0","decimals":18}', label: 'wstETH' },
  { value: '{"symbol":"rETH","address":"0xae78736Cd615f374D3085123A210448E74Fc6393","decimals":18}', label: 'rETH' },
];

// ============================================================================
// MetaProposeEditor - Nested editor for meta-proposal inner action
// ============================================================================

interface MetaProposeEditorProps {
  fieldValues: TemplateFieldValues;
  updateField: (field: string, value: string) => void;
  disabled: boolean;
  validationErrors: ValidationError[];
}

// Templates that can be used inside meta-propose (includes meta for recursion!)
const INNER_TEMPLATE_CATEGORIES = ['payments', 'swaps', 'nouns', 'streams', 'delegation', 'admin', 'meta'] as const;

function MetaProposeEditor({ fieldValues, updateField, disabled, validationErrors }: MetaProposeEditorProps) {
  const [innerTemplateId, setInnerTemplateId] = useState<ActionTemplateType | ''>('');
  const [innerFieldValues, setInnerFieldValues] = useState<TemplateFieldValues>({});
  
  // Get available templates for inner action (includes meta for proposalception!)
  const innerTemplateGroups = INNER_TEMPLATE_CATEGORIES.map(category => ({
    label: category === 'payments' ? 'Payments' :
           category === 'swaps' ? 'Token Buyer' :
           category === 'nouns' ? 'Nouns Token' :
           category === 'streams' ? 'Streams' :
           category === 'delegation' ? 'Delegation' :
           category === 'admin' ? 'DAO Admin' :
           category === 'meta' ? 'Meta (Recursive)' : category,
    options: getTemplatesByCategory(category).map(t => ({
      value: t.id,
      label: t.name,
      description: t.description
    }))
  }));
  
  // Add custom option
  innerTemplateGroups.push({
    label: 'Custom',
    options: [{ value: 'custom', label: 'Custom Transaction', description: 'Build a custom contract call' }]
  });
  
  const innerTemplate = innerTemplateId ? ACTION_TEMPLATES[innerTemplateId] : null;
  
  // Update the inner action JSON when template or fields change
  const updateInnerAction = useCallback((templateId: ActionTemplateType | '', fields: TemplateFieldValues) => {
    if (!templateId) {
      updateField('innerAction', '');
      return;
    }
    
    try {
      const actions = generateActionsFromTemplate(templateId, fields);
      updateField('innerAction', JSON.stringify(actions));
    } catch {
      // If generation fails, store empty
      updateField('innerAction', '');
    }
  }, [updateField]);
  
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
    <div className={styles.templateForm}>
      {/* Inner Proposal Title */}
      <div className={styles.inputGroup}>
        <label className={styles.label}>
          Inner Proposal Title
          <span className={styles.required}>*</span>
        </label>
        <input
          type="text"
          className={styles.input}
          value={fieldValues.innerTitle || ''}
          onChange={(e) => updateField('innerTitle', e.target.value)}
          placeholder="Title for the proposal that will be created"
          disabled={disabled}
        />
        <div className={styles.helpText}>
          This will be the title of the NEW proposal created when this one executes
        </div>
      </div>
      
      {/* Inner Proposal Description */}
      <div className={styles.inputGroup}>
        <label className={styles.label}>
          Inner Proposal Description
          <span className={styles.required}>*</span>
        </label>
        <textarea
          className={styles.textarea}
          value={fieldValues.innerDescription || ''}
          onChange={(e) => updateField('innerDescription', e.target.value)}
          placeholder="Description for the inner proposal"
          disabled={disabled}
          rows={4}
        />
        <div className={styles.helpText}>
          Full description/body of the inner proposal
        </div>
      </div>
      
      {/* Inner Action Section */}
      <div className={styles.nestedActionSection}>
        <label className={styles.label}>
          Inner Proposal Action
          <span className={styles.required}>*</span>
        </label>
        <div className={styles.helpText} style={{ marginBottom: '8px' }}>
          The action the inner proposal will execute when IT passes
        </div>
        
        {/* Inner Template Dropdown */}
        <ActionTemplateDropdown
          groups={innerTemplateGroups}
          value={innerTemplateId}
          onChange={handleInnerTemplateChange}
          placeholder="Select inner action type..."
          disabled={disabled}
        />
        
        {/* Recursive MetaProposeEditor for nested meta-proposals */}
        {innerTemplate?.id === 'meta-propose' && (
          <div className={styles.nestedFields}>
            <MetaProposeEditor
              fieldValues={innerFieldValues}
              updateField={handleInnerFieldChange}
              disabled={disabled}
              validationErrors={[]}
            />
          </div>
        )}
        
        {/* Inner Template Fields (non-meta templates) */}
        {innerTemplate && innerTemplate.id !== 'custom' && innerTemplate.id !== 'meta-propose' && (
          <div className={styles.nestedFields}>
            {innerTemplate.fields.map(field => (
              <div key={field.name} className={styles.inputGroup}>
                <label className={styles.label}>
                  {field.label}
                  {field.required && <span className={styles.required}>*</span>}
                </label>
                
                {field.type === 'select' ? (
                  <select
                    className={styles.select}
                    value={innerFieldValues[field.name] || ''}
                    onChange={(e) => handleInnerFieldChange(field.name, e.target.value)}
                    disabled={disabled}
                  >
                    {field.options?.map(opt => (
                      <option key={opt.value} value={opt.value}>{opt.label}</option>
                    ))}
                  </select>
                ) : field.type === 'address' ? (
                  <AddressInput
                    value={innerFieldValues[field.name] || ''}
                    onChange={(value) => handleInnerFieldChange(field.name, value)}
                    placeholder={field.placeholder || '0x... or name.eth'}
                    disabled={disabled}
                    helpText={field.helpText}
                  />
                ) : field.type === 'token-select' ? (
                  <Select
                    options={TOKEN_OPTIONS}
                    value={innerFieldValues[field.name] || ''}
                    onChange={(value) => handleInnerFieldChange(field.name, value)}
                    placeholder="Select token..."
                    disabled={disabled}
                  />
                ) : field.type === 'stream-select' ? (
                  <StreamSelect
                    value={innerFieldValues[field.name] || ''}
                    onChange={(value) => handleInnerFieldChange(field.name, value)}
                    disabled={disabled}
                  />
                ) : field.type === 'treasury-token-select' ? (
                  <TreasuryTokenSelect
                    value={innerFieldValues[field.name] || ''}
                    onChange={(value) => handleInnerFieldChange(field.name, value)}
                    disabled={disabled}
                  />
                ) : field.type === 'treasury-votes-token-select' ? (
                  <TreasuryTokenSelect
                    value={innerFieldValues[field.name] || ''}
                    onChange={(value) => handleInnerFieldChange(field.name, value)}
                    disabled={disabled}
                    votesOnly
                  />
                ) : field.type === 'predicted-stream-address' ? (
                  <PredictedStreamAddress
                    value={innerFieldValues[field.name] || ''}
                    onChange={(value) => handleInnerFieldChange(field.name, value)}
                    fieldValues={innerFieldValues}
                  />
                ) : (
                  <input
                    type={field.type === 'number' || field.type === 'amount' ? 'number' : 'text'}
                    className={styles.input}
                    value={innerFieldValues[field.name] || ''}
                    onChange={(e) => handleInnerFieldChange(field.name, e.target.value)}
                    placeholder={field.placeholder}
                    disabled={disabled}
                  />
                )}
                
                {field.helpText && field.type !== 'address' && (
                  <div className={styles.helpText}>{field.helpText}</div>
                )}
              </div>
            ))}
          </div>
        )}
        
        {/* Custom inner action - show raw fields */}
        {innerTemplate?.id === 'custom' && (
          <div className={styles.nestedFields}>
            <div className={styles.inputGroup}>
              <label className={styles.label}>Target Address</label>
              <AddressInput
                value={innerFieldValues.target || ''}
                onChange={(value) => {
                  const newFields = { ...innerFieldValues, target: value };
                  setInnerFieldValues(newFields);
                  updateField('innerAction', JSON.stringify([{
                    target: value,
                    value: innerFieldValues.value || '0',
                    signature: innerFieldValues.signature || '',
                    calldata: innerFieldValues.calldata || '0x'
                  }]));
                }}
                placeholder="0x..."
                disabled={disabled}
              />
            </div>
            <div className={styles.inputGroup}>
              <label className={styles.label}>ETH Value</label>
              <input
                type="text"
                className={styles.input}
                value={innerFieldValues.value || '0'}
                onChange={(e) => {
                  const newFields = { ...innerFieldValues, value: e.target.value };
                  setInnerFieldValues(newFields);
                  updateField('innerAction', JSON.stringify([{
                    target: innerFieldValues.target || '',
                    value: e.target.value,
                    signature: innerFieldValues.signature || '',
                    calldata: innerFieldValues.calldata || '0x'
                  }]));
                }}
                placeholder="0"
                disabled={disabled}
              />
            </div>
            <div className={styles.inputGroup}>
              <label className={styles.label}>Function Signature</label>
              <input
                type="text"
                className={styles.input}
                value={innerFieldValues.signature || ''}
                onChange={(e) => {
                  const newFields = { ...innerFieldValues, signature: e.target.value };
                  setInnerFieldValues(newFields);
                  updateField('innerAction', JSON.stringify([{
                    target: innerFieldValues.target || '',
                    value: innerFieldValues.value || '0',
                    signature: e.target.value,
                    calldata: innerFieldValues.calldata || '0x'
                  }]));
                }}
                placeholder="e.g., transfer(address,uint256)"
                disabled={disabled}
              />
            </div>
            <div className={styles.inputGroup}>
              <label className={styles.label}>Calldata</label>
              <input
                type="text"
                className={styles.input}
                value={innerFieldValues.calldata || '0x'}
                onChange={(e) => {
                  const newFields = { ...innerFieldValues, calldata: e.target.value };
                  setInnerFieldValues(newFields);
                  updateField('innerAction', JSON.stringify([{
                    target: innerFieldValues.target || '',
                    value: innerFieldValues.value || '0',
                    signature: innerFieldValues.signature || '',
                    calldata: e.target.value
                  }]));
                }}
                placeholder="0x..."
                disabled={disabled}
              />
            </div>
          </div>
        )}
      </div>
      
      {validationErrors.find(err => err.field === 'innerAction') && (
        <div className={styles.error}>
          {validationErrors.find(err => err.field === 'innerAction')?.message}
        </div>
      )}
    </div>
  );
}

// ============================================================================
// ActionTemplateEditor - Main Component
// ============================================================================

interface ActionTemplateEditorProps {
  index: number;
  templateState: ActionTemplateState;
  onUpdateTemplateState: (state: ActionTemplateState) => void;
  disabled?: boolean;
  /**
   * Per-action simulation results aligned with `generatedActions`. Entries are
   * `undefined` for actions skipped from simulation (empty target) or when no
   * simulation has run yet.
   */
  simulationResults?: Array<TransactionResult | undefined>;
  /**
   * Proposal-wide Tenderly share URL. When present, per-row Tenderly links
   * are suppressed (the share link in the bottom pill covers everything).
   */
  shareUrl?: string;
}

// Option group for dropdown
interface TemplateGroup {
  label: string;
  options: { value: string; label: string; description?: string }[];
}

export function ActionTemplateEditor({
  index,
  templateState,
  onUpdateTemplateState,
  disabled = false,
  simulationResults,
  shareUrl,
}: ActionTemplateEditorProps) {
  const [selectedCategory, setSelectedCategory] = useState<string>('');
  
  const {
    selectedTemplate,
    fieldValues,
    generatedActions,
    validationErrors,
    setSelectedTemplate,
    updateField,
    resetTemplate,
  } = useActionTemplate();

  const initializedRef = useRef(false);
  const lastStateRef = useRef<string>('');
  const lastTemplateIdRef = useRef<string>(templateState.templateId);
  
  // Stable callback reference for parent updates
  const stableOnUpdate = useRef(onUpdateTemplateState);
  stableOnUpdate.current = onUpdateTemplateState;
  
  // Initialize from saved template state on mount OR when templateId changes externally
  useEffect(() => {
    const templateIdChanged = lastTemplateIdRef.current !== templateState.templateId;
    
    // Re-initialize if this is the first time OR if the template ID changed externally
    // (e.g., when loading edit data for a candidate)
    if ((!initializedRef.current || templateIdChanged) && templateState.templateId) {
      // If template changed, reset the hook state first
      if (templateIdChanged && initializedRef.current) {
        resetTemplate();
      }
      
      setSelectedTemplate(templateState.templateId as ActionTemplateType);
      
      // Restore field values - use setTimeout to ensure setSelectedTemplate has updated state first
      setTimeout(() => {
        Object.entries(templateState.fieldValues).forEach(([field, value]) => {
          if (value) {
            updateField(field, value);
          }
        });
      }, 0);
      
      // Update category for dropdown display
      if (templateState.templateId !== 'custom') {
        const template = ACTION_TEMPLATES[templateState.templateId as ActionTemplateType];
        if (template) {
          setSelectedCategory(template.category);
        }
      } else {
        setSelectedCategory('custom');
      }
      
      lastTemplateIdRef.current = templateState.templateId;
      initializedRef.current = true;
    }
  }, [templateState.templateId, templateState.fieldValues, setSelectedTemplate, updateField, resetTemplate]);
  
  // Update parent template state when fields or actions change
  // Use JSON comparison to prevent infinite loops
  useEffect(() => {
    if (!initializedRef.current) return;

    const newState: ActionTemplateState = {
      // Use empty string when no template is selected (not 'custom')
      templateId: selectedTemplate?.id || '',
      fieldValues: fieldValues,
      generatedActions: generatedActions
    };

    // Compare with previous state to avoid infinite updates
    const newStateStr = JSON.stringify(newState);
    if (newStateStr !== lastStateRef.current) {
      lastStateRef.current = newStateStr;
      stableOnUpdate.current(newState);
    }
  }, [fieldValues, generatedActions, selectedTemplate]);

  // Auto-default recipient / amount / tokenAddress for stream-restream when
  // the user picks a source stream. Only fires when the SOURCE changes — user
  // edits to recipient/amount made after the auto-fill survive subsequent
  // re-renders.
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
    if (lastRestreamSourceRef.current === sourceAddr) return; // already auto-filled for this source

    const source = streamsData?.streams.find(
      (s) => s.streamAddress.toLowerCase() === sourceAddr.toLowerCase(),
    );
    if (!source) return; // source not loaded yet; effect will re-run when data arrives

    const tokenMeta = COMMON_TOKENS.find(
      (t) => t.address.toLowerCase() === source.tokenAddress.toLowerCase(),
    );
    const decimals = tokenMeta?.decimals ?? 18;

    // tokenAddress is an internal field — populated so PredictedStreamAddress
    // and the generator can read it. Stored as JSON for consistency with the
    // existing token-select payload shape.
    updateField(
      'tokenAddress',
      JSON.stringify({
        address: source.tokenAddress,
        symbol: tokenMeta?.symbol || 'TOKEN',
        decimals,
        isNative: false,
      }),
    );

    // Default new-stream recipient to the source's recipient.
    updateField('recipient', source.recipient);

    // Default amount to the predicted unvested remainder at proposal-creation
    // time: tokenAmount * (1 - vestedRatio), using 4-decimal precision math.
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

  const handleTemplateSelect = (templateId: string) => {
    // Mark as initialized when user manually selects a template
    // This ensures sync back to parent works even when starting fresh
    initializedRef.current = true;
    
    if (templateId === '') {
      setSelectedTemplate(null);
      setSelectedCategory('');
      return;
    }

    if (templateId === 'custom') {
      setSelectedTemplate('custom' as ActionTemplateType);
      setSelectedCategory('custom');
      return;
    }

    setSelectedTemplate(templateId as ActionTemplateType);
    const template = ACTION_TEMPLATES[templateId as ActionTemplateType];
    if (template) {
      setSelectedCategory(template.category);
    }
  };

  // Group templates by category for dropdown
  const paymentsTemplates = getTemplatesByCategory('payments');
  const streamTemplates = getTemplatesByCategory('streams');
  const swapTemplates = getTemplatesByCategory('swaps');
  const nounTemplates = getTemplatesByCategory('nouns');
  const delegationTemplates = getTemplatesByCategory('delegation');
  const adminTemplates = getTemplatesByCategory('admin');
  const metaTemplates = getTemplatesByCategory('meta');

  // Build option groups with descriptions
  const optionGroups: TemplateGroup[] = [
    { label: 'Payments', options: paymentsTemplates.map(t => ({ value: t.id, label: t.name, description: t.description })) },
    { label: 'Streams', options: streamTemplates.map(t => ({ value: t.id, label: t.name, description: t.description })) },
    { label: 'Nouns Token', options: nounTemplates.map(t => ({ value: t.id, label: t.name, description: t.description })) },
    { label: 'Delegation', options: delegationTemplates.map(t => ({ value: t.id, label: t.name, description: t.description })) },
    { label: 'Token Buyer', options: swapTemplates.map(t => ({ value: t.id, label: t.name, description: t.description })) },
    { label: 'Meta', options: metaTemplates.map(t => ({ value: t.id, label: t.name, description: t.description })) },
    { label: 'Custom', options: [{ value: 'custom', label: 'Custom Transaction', description: 'Build a custom contract call' }] },
    { label: 'DAO Admin Functions', options: adminTemplates.map(t => ({ value: t.id, label: t.name, description: t.description })) }
  ];

  // Render template-specific form
  const renderTemplateForm = () => {
    if (!selectedTemplate) return null;

    if (selectedTemplate.id === 'custom') {
      const customAction = templateState.generatedActions[0] || { target: '', value: '0', signature: '', calldata: '0x' };
      
      return (
        <SmartActionEditor
          index={index}
          target={customAction.target}
          value={customAction.value}
          signature={customAction.signature}
          calldata={customAction.calldata}
          onUpdate={(field, value) => {
            const updatedAction = { ...customAction, [field]: value };
            onUpdateTemplateState({
              templateId: 'custom',
              fieldValues: {},
              generatedActions: [updatedAction]
            });
          }}
          disabled={disabled}
        />
      );
    }

    // Meta-propose: show title/description fields + nested action editor
    if (selectedTemplate.id === 'meta-propose') {
      return (
        <MetaProposeEditor
          fieldValues={fieldValues}
          updateField={updateField}
          disabled={disabled}
          validationErrors={validationErrors}
        />
      );
    }

    // Noun swap: visual Noun selection with approval flow
    if (selectedTemplate.id === 'noun-swap') {
      return (
        <NounSwapTemplate
          template={selectedTemplate}
          fieldValues={fieldValues}
          onUpdateField={updateField}
          validationErrors={validationErrors}
          disabled={disabled}
        />
      );
    }

    // Default: render fields from template
    return (
      <div className={styles.templateForm}>
        {selectedTemplate.fields.map(field => {
          // For 'amount' fields, surface the picked token's symbol next to the
          // label so users always see what currency they're typing in. The
          // symbol is parsed out of a sibling `token` or `tokenAddress` field
          // that holds the token-select JSON payload.
          const tokenSymbolHint =
            field.type === 'amount'
              ? extractTokenSymbol(fieldValues.token || fieldValues.tokenAddress)
              : null;

          return (
          <div key={field.name} className={styles.inputGroup}>
            <label className={styles.label}>
              {field.label}{tokenSymbolHint ? ` (${tokenSymbolHint})` : ''}
              {field.required && <span className={styles.required}>*</span>}
            </label>
            
            {field.type === 'select' ? (
              <select
                className={styles.select}
                value={fieldValues[field.name] || ''}
                onChange={(e) => updateField(field.name, e.target.value)}
                disabled={disabled}
              >
                {field.options?.map(opt => (
                  <option key={opt.value} value={opt.value}>{opt.label}</option>
                ))}
              </select>
            ) : field.type === 'date' ? (
              <input
                type="datetime-local"
                className={styles.input}
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
                className={styles.input}
                value={fieldValues[field.name] || ''}
                onChange={(e) => updateField(field.name, e.target.value)}
                placeholder={field.placeholder}
                disabled={disabled}
              />
            )}

            {field.helpText && field.type !== 'address' && (
              <div className={styles.helpText}>{field.helpText}</div>
            )}

            {validationErrors.find(err => err.field === field.name) && (
              <div className={styles.error}>
                {validationErrors.find(err => err.field === field.name)?.message}
              </div>
            )}
          </div>
          );
        })}
      </div>
    );
  };

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <span className={styles.actionLabel}>Transaction {index + 1}</span>
      </div>

      {/* Template Selection Dropdown */}
      <div className={styles.inputGroup}>
        <label className={styles.label}>Transaction Type *</label>
        <ActionTemplateDropdown
          groups={optionGroups}
          value={selectedTemplate?.id || ''}
          onChange={handleTemplateSelect}
          placeholder="Select transaction type..."
          disabled={disabled}
        />

      </div>

      {/* Template-specific form */}
      {renderTemplateForm()}

      {/* Decoded summary of what the proposal will do, plus raw fields on demand */}
      {selectedTemplate && selectedTemplate.id !== 'custom' && generatedActions.length > 0 && (
        <DecodedActionsPreview
          actions={generatedActions}
          simulationResults={simulationResults}
          shareUrl={shareUrl}
        />
      )}
    </div>
  );
}

// ============================================================================
// DecodedActionsPreview — human-readable summary + per-action sim results
// ============================================================================

interface ProposalAction {
  target: string;
  value: string;
  signature: string;
  calldata: string;
}

interface DecodedActionsPreviewProps {
  actions: ProposalAction[];
  simulationResults?: Array<TransactionResult | undefined>;
  shareUrl?: string;
}

function DecodedActionsPreview({
  actions,
  simulationResults,
  shareUrl,
}: DecodedActionsPreviewProps) {
  const decoded = useDecodedTransactions(actions);

  // Aggregate sim state for the collapsed summary so users can see overall
  // pass/fail at a glance without expanding.
  const resultsWithData = simulationResults?.filter((r) => r !== undefined) ?? [];
  const hasAnyResult = resultsWithData.length > 0;
  const allPassed = hasAnyResult && resultsWithData.every((r) => r!.success);
  const anyFailed = hasAnyResult && resultsWithData.some((r) => !r!.success);

  return (
    <details className={styles.decodedPreview}>
      <summary className={styles.decodedHeader}>
        <span className={styles.decodedHeaderCaret} aria-hidden>▶</span>
        <span>Transactions</span>
        {decoded.length > 1 && (
          <span className={styles.decodedHeaderCount}>· {decoded.length}</span>
        )}
        {anyFailed && (
          <span className={`${styles.decodedHeaderStatus} ${styles.decodedStatusFail}`}>✗</span>
        )}
        {!anyFailed && allPassed && (
          <span className={`${styles.decodedHeaderStatus} ${styles.decodedStatusPass}`}>✓</span>
        )}
      </summary>
      <ol className={styles.decodedList}>
        {decoded.map((d, idx) => {
          const dest = d.params?.to || d.params?.contract;
          const isContract = !!d.params?.contract;
          const action = actions[idx];
          const simResult = simulationResults?.[idx];
          const hasResult = simResult !== undefined;
          const gas = hasResult ? parseInt(simResult.gasUsed, 10) : 0;

          let statusClass = styles.decodedStatusNeutral;
          let statusIcon = '–';
          if (hasResult && simResult.success) {
            statusClass = styles.decodedStatusPass;
            statusIcon = '✓';
          } else if (hasResult && !simResult.success) {
            statusClass = styles.decodedStatusFail;
            statusIcon = '✗';
          }

          const tenderlyLink = !shareUrl && action ? getTenderlySimulatorUrl(action) : null;
          const showFooter = tenderlyLink !== null || hasResult;

          return (
            <li key={idx} className={styles.decodedItem}>
              <div className={styles.decodedTitleRow}>
                <span className={styles.decodedTitle}>{d.title}</span>
              </div>
              {d.description && <div className={styles.decodedDesc}>{d.description}</div>}
              {dest && (
                <div className={styles.decodedDest}>
                  <span className={styles.decodedDestLabel}>
                    {isContract ? 'Contract' : 'To'}:
                  </span>{' '}
                  <AddressWithENS address={dest} className={styles.decodedAddr} />
                </div>
              )}
              {hasResult && !simResult.success && (
                <div className={styles.decodedError}>
                  {simResult.errorMessage || simResult.error || 'Transaction failed'}
                </div>
              )}
              {showFooter && (
                <div className={styles.decodedFooter}>
                  {tenderlyLink ? (
                    <a
                      href={tenderlyLink}
                      target="_blank"
                      rel="noopener noreferrer"
                      className={styles.decodedTenderly}
                    >
                      Verify on Tenderly →
                    </a>
                  ) : (
                    <span />
                  )}
                  {hasResult && (
                    <span className={styles.decodedSimStatus}>
                      {gas > 0 && (
                        <span className={styles.decodedGas}>{formatGas(simResult.gasUsed)} gas</span>
                      )}
                      <span className={`${styles.decodedStatus} ${statusClass}`}>{statusIcon}</span>
                    </span>
                  )}
                </div>
              )}
            </li>
          );
        })}
      </ol>
      <details className={styles.rawDetails}>
        <summary className={styles.rawSummary}>Show raw calldata</summary>
        {actions.map((action, idx) => (
          <div key={idx} className={styles.generatedAction}>
            {actions.length > 1 && (
              <div className={styles.actionNumber}>Transaction {idx + 1}</div>
            )}
            <div className={styles.generatedField}>
              <span className={styles.generatedLabel}>Target:</span>
              <code className={styles.generatedValue}>{action.target}</code>
            </div>
            <div className={styles.generatedField}>
              <span className={styles.generatedLabel}>Value:</span>
              <code className={styles.generatedValue}>{action.value}</code>
            </div>
            <div className={styles.generatedField}>
              <span className={styles.generatedLabel}>Signature:</span>
              <code className={styles.generatedValue}>{action.signature}</code>
            </div>
            <div className={styles.generatedField}>
              <span className={styles.generatedLabel}>Calldata:</span>
              <code className={styles.generatedValueLong}>{action.calldata}</code>
            </div>
          </div>
        ))}
      </details>
    </details>
  );
}

/**
 * Pull a token symbol out of a token-picker field's stored value. Field may
 * hold either a raw 0x address (in which case we look it up in known tokens)
 * or a JSON-stringified {symbol, address, decimals, ...} payload.
 */
function extractTokenSymbol(raw: string | undefined): string | null {
  if (!raw) return null;
  // JSON payload (treasury-token-select / token-select shape)
  try {
    const parsed = JSON.parse(raw);
    if (parsed && typeof parsed.symbol === 'string') return parsed.symbol;
  } catch {
    /* fall through */
  }
  // Raw 0x address — match against the curated list
  if (raw.startsWith('0x') && raw.length === 42) {
    const match = COMMON_TOKENS.find(
      (t) => t.address.toLowerCase() === raw.toLowerCase(),
    );
    if (match) return match.symbol;
  }
  return null;
}

