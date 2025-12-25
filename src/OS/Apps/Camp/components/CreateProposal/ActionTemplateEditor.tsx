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
} from '../../utils/actionTemplates';
import type { ActionTemplateState } from '../../utils/types';
import { useActionTemplate } from '../../utils/hooks/useActionTemplate';
import { SmartActionEditor } from './SmartActionEditor';
import styles from './ActionTemplateEditor.module.css';

interface ActionTemplateEditorProps {
  index: number;
  templateState: ActionTemplateState;
  onUpdateTemplateState: (state: ActionTemplateState) => void;
  disabled?: boolean;
}

// Option group for select
interface SelectOptionGroup {
  label: string;
  options: { value: string; label: string }[];
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

  const handleTemplateSelect = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const templateId = e.target.value;
    
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

  // Build option groups
  const optionGroups: SelectOptionGroup[] = [
    { label: 'Treasury Transfers', options: treasuryTemplates.map(t => ({ value: t.id, label: t.name })) },
    { label: 'Streams', options: paymentTemplates.map(t => ({ value: t.id, label: t.name })) },
    { label: 'Token Buyer', options: swapTemplates.map(t => ({ value: t.id, label: t.name })) },
    { label: 'Nouns Token', options: nounTemplates.map(t => ({ value: t.id, label: t.name })) },
    { label: 'Custom', options: [{ value: 'custom', label: 'Custom Transaction' }] },
    { label: 'DAO Admin Functions', options: adminTemplates.map(t => ({ value: t.id, label: t.name })) }
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
            
            {field.helpText && (
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
        <select
          className={styles.select}
          value={selectedTemplate?.id || ''}
          onChange={handleTemplateSelect}
          disabled={disabled}
        >
          <option value="">Select action type...</option>
          {optionGroups.map(group => (
            <optgroup key={group.label} label={group.label}>
              {group.options.map(opt => (
                <option key={opt.value} value={opt.value}>{opt.label}</option>
              ))}
            </optgroup>
          ))}
        </select>

        {selectedTemplate && selectedTemplate.id !== 'custom' && (
          <div className={styles.templateDescription}>
            {selectedTemplate.description}
            {selectedTemplate.isMultiAction && (
              <span className={styles.multiActionBadge}>
                {' '}• Multi-action template{generatedActions.length > 0 ? ` (${generatedActions.length} actions)` : ''}
              </span>
            )}
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

