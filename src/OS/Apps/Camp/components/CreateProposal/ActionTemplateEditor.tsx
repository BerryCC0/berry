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
import styles from './ActionTemplateEditor.module.css';

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
const INNER_TEMPLATE_CATEGORIES = ['treasury', 'swaps', 'nouns', 'payments', 'admin', 'meta'] as const;

function MetaProposeEditor({ fieldValues, updateField, disabled, validationErrors }: MetaProposeEditorProps) {
  const [innerTemplateId, setInnerTemplateId] = useState<ActionTemplateType | ''>('');
  const [innerFieldValues, setInnerFieldValues] = useState<TemplateFieldValues>({});
  
  // Get available templates for inner action (includes meta for proposalception!)
  const innerTemplateGroups = INNER_TEMPLATE_CATEGORIES.map(category => ({
    label: category === 'treasury' ? 'Treasury Transfers' :
           category === 'swaps' ? 'Token Buyer' :
           category === 'nouns' ? 'Nouns Token' :
           category === 'payments' ? 'Streams' :
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
                  <select
                    className={styles.select}
                    value={innerFieldValues[field.name] || ''}
                    onChange={(e) => handleInnerFieldChange(field.name, e.target.value)}
                    disabled={disabled}
                  >
                    <option value="">Select token...</option>
                    <option value='{"symbol":"USDC","address":"0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48","decimals":6}'>USDC</option>
                    <option value='{"symbol":"WETH","address":"0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2","decimals":18}'>WETH</option>
                    <option value='{"symbol":"DAI","address":"0x6B175474E89094C44Da98b954EedeAC495271d0F","decimals":18}'>DAI</option>
                    <option value='{"symbol":"stETH","address":"0xae7ab96520DE3A18E5e111B5EaAb095312D7fE84","decimals":18}'>stETH</option>
                    <option value='{"symbol":"wstETH","address":"0x7f39C581F595B53c5cb19bD0b3f8dA6c935E2Ca0","decimals":18}'>wstETH</option>
                    <option value='{"symbol":"rETH","address":"0xae78736Cd615f374D3085123A210448E74Fc6393","decimals":18}'>rETH</option>
                  </select>
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
}: ActionTemplateEditorProps) {
  const [selectedCategory, setSelectedCategory] = useState<string>('');
  
  const {
    selectedTemplate,
    fieldValues,
    generatedActions,
    validationErrors,
    setSelectedTemplate,
    updateField,
  } = useActionTemplate();

  const initializedRef = useRef(false);
  const lastStateRef = useRef<string>('');
  
  // Stable callback reference for parent updates
  const stableOnUpdate = useRef(onUpdateTemplateState);
  stableOnUpdate.current = onUpdateTemplateState;
  
  // Initialize from saved template state on mount
  useEffect(() => {
    if (!initializedRef.current && templateState.templateId) {
      setSelectedTemplate(templateState.templateId as ActionTemplateType);
      
      // Restore field values
      Object.entries(templateState.fieldValues).forEach(([field, value]) => {
        if (value) {
          updateField(field, value);
        }
      });
      
      initializedRef.current = true;
    }
  }, [templateState.templateId, templateState.fieldValues, setSelectedTemplate, updateField]);
  
  // Update parent template state when fields or actions change
  // Use JSON comparison to prevent infinite loops
  useEffect(() => {
    if (!initializedRef.current) return;
    
    const newState: ActionTemplateState = {
      templateId: selectedTemplate?.id || 'custom',
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

  const handleTemplateSelect = (templateId: string) => {
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
  const treasuryTemplates = getTemplatesByCategory('treasury');
  const swapTemplates = getTemplatesByCategory('swaps');
  const nounTemplates = getTemplatesByCategory('nouns');
  const paymentTemplates = getTemplatesByCategory('payments');
  const adminTemplates = getTemplatesByCategory('admin');
  const metaTemplates = getTemplatesByCategory('meta');

  // Build option groups with descriptions
  const optionGroups: TemplateGroup[] = [
    { label: 'Treasury Transfers', options: treasuryTemplates.map(t => ({ value: t.id, label: t.name, description: t.description })) },
    { label: 'Streams', options: paymentTemplates.map(t => ({ value: t.id, label: t.name, description: t.description })) },
    { label: 'Token Buyer', options: swapTemplates.map(t => ({ value: t.id, label: t.name, description: t.description })) },
    { label: 'Nouns Token', options: nounTemplates.map(t => ({ value: t.id, label: t.name, description: t.description })) },
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
        {selectedTemplate.fields.map(field => (
          <div key={field.name} className={styles.inputGroup}>
            <label className={styles.label}>
              {field.label}
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
              <select
                className={styles.select}
                value={fieldValues[field.name] || ''}
                onChange={(e) => updateField(field.name, e.target.value)}
                disabled={disabled}
              >
                <option value="">Select token...</option>
                <option value='{"symbol":"USDC","address":"0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48","decimals":6}'>USDC</option>
                <option value='{"symbol":"WETH","address":"0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2","decimals":18}'>WETH</option>
                <option value='{"symbol":"DAI","address":"0x6B175474E89094C44Da98b954EedeAC495271d0F","decimals":18}'>DAI</option>
                <option value='{"symbol":"stETH","address":"0xae7ab96520DE3A18E5e111B5EaAb095312D7fE84","decimals":18}'>stETH</option>
                <option value='{"symbol":"wstETH","address":"0x7f39C581F595B53c5cb19bD0b3f8dA6c935E2Ca0","decimals":18}'>wstETH</option>
                <option value='{"symbol":"rETH","address":"0xae78736Cd615f374D3085123A210448E74Fc6393","decimals":18}'>rETH</option>
              </select>
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
        ))}
      </div>
    );
  };

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <span className={styles.actionLabel}>Action {index + 1}</span>
      </div>

      {/* Template Selection Dropdown */}
      <div className={styles.inputGroup}>
        <label className={styles.label}>Action Type *</label>
        <ActionTemplateDropdown
          groups={optionGroups}
          value={selectedTemplate?.id || ''}
          onChange={handleTemplateSelect}
          placeholder="Select action type..."
          disabled={disabled}
        />

        {selectedTemplate && selectedTemplate.id !== 'custom' && selectedTemplate.isMultiAction && (
          <div className={styles.templateDescription}>
            <span className={styles.multiActionBadge}>
              Multi-action template{generatedActions.length > 0 ? ` (${generatedActions.length} actions)` : ''}
            </span>
          </div>
        )}
      </div>

      {/* Template-specific form */}
      {renderTemplateForm()}

      {/* Show generated transaction details for templates */}
      {selectedTemplate && selectedTemplate.id !== 'custom' && generatedActions.length > 0 && (
        <details className={styles.advancedSection}>
          <summary className={styles.advancedHeader}>
            Generated Transaction Details ({generatedActions.length} transaction{generatedActions.length > 1 ? 's' : ''})
          </summary>
          
          {generatedActions.map((genAction, idx) => (
            <div key={idx} className={styles.generatedAction}>
              {generatedActions.length > 1 && (
                <div className={styles.actionNumber}>Transaction {idx + 1}</div>
              )}
              
              <div className={styles.generatedField}>
                <span className={styles.generatedLabel}>Target:</span>
                <code className={styles.generatedValue}>{genAction.target}</code>
              </div>
              <div className={styles.generatedField}>
                <span className={styles.generatedLabel}>Value:</span>
                <code className={styles.generatedValue}>{genAction.value}</code>
              </div>
              <div className={styles.generatedField}>
                <span className={styles.generatedLabel}>Signature:</span>
                <code className={styles.generatedValue}>{genAction.signature}</code>
              </div>
              <div className={styles.generatedField}>
                <span className={styles.generatedLabel}>Calldata:</span>
                <code className={styles.generatedValueLong}>{genAction.calldata}</code>
              </div>
            </div>
          ))}
        </details>
      )}
    </div>
  );
}

