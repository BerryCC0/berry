/**
 * useActionTemplate Hook
 * State management for action template editor
 */

import { useState, useEffect, useCallback } from 'react';
import {
  ActionTemplateType,
  ActionTemplate,
  ProposalAction,
  TemplateFieldValues,
  getTemplate,
  generateActionsFromTemplate,
} from '../actionTemplates';

interface ValidationError {
  field: string;
  message: string;
}

interface UseActionTemplateReturn {
  selectedTemplate: ActionTemplate | null;
  fieldValues: TemplateFieldValues;
  generatedActions: ProposalAction[];
  validationErrors: ValidationError[];
  isValid: boolean;
  
  // Actions
  setSelectedTemplate: (templateId: ActionTemplateType | null) => void;
  updateField: (fieldName: string, value: string) => void;
  updateFields: (values: TemplateFieldValues) => void;
  resetTemplate: () => void;
  validateFields: () => boolean;
}

/**
 * Hook for managing action template state and generation
 */
export function useActionTemplate(): UseActionTemplateReturn {
  const [selectedTemplate, setSelectedTemplateState] = useState<ActionTemplate | null>(null);
  const [fieldValues, setFieldValues] = useState<TemplateFieldValues>({});
  const [generatedActions, setGeneratedActions] = useState<ProposalAction[]>([]);
  const [validationErrors, setValidationErrors] = useState<ValidationError[]>([]);

  // Set selected template, preserving field values for fields that exist in both templates
  const setSelectedTemplate = useCallback((templateId: ActionTemplateType | null) => {
    if (!templateId) {
      setSelectedTemplateState(null);
      setFieldValues({});
      setGeneratedActions([]);
      setValidationErrors([]);
      return;
    }

    const template = getTemplate(templateId);
    if (template) {
      setSelectedTemplateState(template);
      
      // Initialize field values, preserving values for fields that exist in both templates
      // This allows switching between similar templates (e.g., treasury-eth to treasury-usdc)
      // without requiring users to re-enter the recipient address
      setFieldValues(prevValues => {
        const newValues: TemplateFieldValues = {};
        template.fields.forEach(field => {
          // Preserve existing value if the field name matches
          newValues[field.name] = prevValues[field.name] || '';
        });
        return newValues;
      });
      setGeneratedActions([]);
      setValidationErrors([]);
    }
  }, []);

  // Update single field value
  const updateField = useCallback((fieldName: string, value: string) => {
    setFieldValues(prev => ({
      ...prev,
      [fieldName]: value,
    }));
  }, []);

  // Update multiple field values
  const updateFields = useCallback((values: TemplateFieldValues) => {
    setFieldValues(prev => ({
      ...prev,
      ...values,
    }));
  }, []);

  // Reset template to initial state
  const resetTemplate = useCallback(() => {
    setSelectedTemplateState(null);
    setFieldValues({});
    setGeneratedActions([]);
    setValidationErrors([]);
  }, []);

  // Validate all fields
  const validateFields = useCallback((): boolean => {
    if (!selectedTemplate) return false;

    const errors: ValidationError[] = [];

    // Validate each field
    selectedTemplate.fields.forEach(field => {
      const value = fieldValues[field.name];

      // Check required fields
      if (field.required && (!value || value.trim() === '')) {
        errors.push({
          field: field.name,
          message: `${field.label} is required`,
        });
        return;
      }

      // Skip validation if field is empty and not required
      if (!value || value.trim() === '') {
        return;
      }

      // Validate by type
      switch (field.type) {
        case 'address':
          if (!/^0x[a-fA-F0-9]{40}$/.test(value) && !value.endsWith('.eth')) {
            errors.push({
              field: field.name,
              message: `Invalid address format`,
            });
          }
          break;

        case 'amount':
          const amount = parseFloat(value);
          if (isNaN(amount)) {
            errors.push({
              field: field.name,
              message: `Invalid amount`,
            });
          } else if (field.validation) {
            if (field.validation.min !== undefined && amount < field.validation.min) {
              errors.push({
                field: field.name,
                message: `Amount must be at least ${field.validation.min}`,
              });
            }
            if (field.validation.max !== undefined && amount > field.validation.max) {
              errors.push({
                field: field.name,
                message: `Amount must be at most ${field.validation.max}`,
              });
            }
          }
          break;

        case 'number':
          const num = parseInt(value, 10);
          if (isNaN(num)) {
            errors.push({
              field: field.name,
              message: `Invalid number`,
            });
          } else if (field.validation) {
            if (field.validation.min !== undefined && num < field.validation.min) {
              errors.push({
                field: field.name,
                message: `Value must be at least ${field.validation.min}`,
              });
            }
            if (field.validation.max !== undefined && num > field.validation.max) {
              errors.push({
                field: field.name,
                message: `Value must be at most ${field.validation.max}`,
              });
            }
          }
          break;

        case 'date':
          const date = new Date(value);
          if (isNaN(date.getTime())) {
            errors.push({
              field: field.name,
              message: `Invalid date`,
            });
          }
          break;
      }
    });

    setValidationErrors(errors);
    return errors.length === 0;
  }, [selectedTemplate, fieldValues]);

  // Generate actions whenever template or field values change
  useEffect(() => {
    if (!selectedTemplate) {
      setGeneratedActions([]);
      return;
    }

    // Check if all required fields are filled
    const allRequiredFilled = selectedTemplate.fields
      .filter(field => field.required)
      .every(field => {
        const value = fieldValues[field.name];
        return value && value.trim() !== '';
      });

    if (!allRequiredFilled) {
      setGeneratedActions([]);
      return;
    }

    // Skip generation for custom template - actions are managed manually
    if (selectedTemplate.id === 'custom') {
      return;
    }

    // Generate actions
    try {
      const actions = generateActionsFromTemplate(selectedTemplate.id, fieldValues);
      setGeneratedActions(actions);
    } catch (error) {
      console.error('Failed to generate actions:', error);
      setGeneratedActions([]);
    }
  }, [selectedTemplate, fieldValues]);

  return {
    selectedTemplate,
    fieldValues,
    generatedActions,
    validationErrors,
    isValid: validationErrors.length === 0 && generatedActions.length > 0,
    
    setSelectedTemplate,
    updateField,
    updateFields,
    resetTemplate,
    validateFields,
  };
}

