/**
 * custom — raw calldata escape hatch. The user provides target / value /
 * signature / calldata directly; encode passes them through verbatim.
 *
 * decode() always returns null — this template never CLAIMS a decoded shape.
 * The legacy parser uses 'custom' as the FALLBACK template when no other
 * matcher catches the action, so registry dispatch needs to let unmatched
 * actions fall through to legacy custom handling.
 */

import type { TransactionActionDef } from '../types';

interface Fields {
  target: string;
  value: string;
  signature: string;
  calldata: string;
}

export const customAction: TransactionActionDef<Fields> = {
  id: 'custom',
  category: 'custom',
  name: 'Custom Action',
  description: 'Hand-crafted target, value, signature, calldata',
  isMultiAction: false,
  fields: [
    { name: 'target', label: 'Target', type: 'address', required: true },
    { name: 'value', label: 'Value (wei)', type: 'text', required: true },
    { name: 'signature', label: 'Function Signature', type: 'text' },
    { name: 'calldata', label: 'Calldata', type: 'text' },
  ],

  encode(values) {
    return [
      {
        target: values.target || '',
        value: values.value || '0',
        signature: values.signature || '',
        calldata: values.calldata || '0x',
      },
    ];
  },

  decode() {
    // Never claim — let unmatched actions reach the legacy custom fallback,
    // which packages them as a custom template state for the editor.
    return null;
  },

  describe() {
    return [];
  },
};
