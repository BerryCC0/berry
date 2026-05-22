/**
 * descriptor-add-many-backgrounds — `addManyBackgrounds(string[])`. Bulk
 * version of addBackground. User inputs comma-separated hex colors; we
 * normalise (strip whitespace + leading '#') before encoding.
 */

import { encodeAbiParameters, parseAbiParameters, type Address } from 'viem';
import { NOUNS_ADDRESSES } from '@/app/lib/nouns';
import {
  decodeArgs,
  matchSignature,
  matchTarget,
} from '../shared';
import type { TransactionActionDef } from '../types';

interface Fields {
  colors: string;
}

const SIG = 'addManyBackgrounds(string[])';
const TARGET = NOUNS_ADDRESSES.descriptor as Address;

function parseColors(raw: string | undefined): string[] {
  return (raw || '')
    .split(',')
    .map((c) => c.trim().replace(/^#/, ''))
    .filter((c) => c.length > 0);
}

export const descriptorAddManyBackgrounds: TransactionActionDef<Fields> = {
  id: 'descriptor-add-many-backgrounds',
  category: 'descriptor',
  name: 'Add Many Background Colors',
  description: 'Bulk-append background colors to the descriptor palette',
  isMultiAction: false,
  fields: [
    {
      name: 'colors',
      label: 'Hex Colors (comma-separated)',
      type: 'text',
      required: true,
      placeholder: 'e6e6e6, ffffff, 000000',
    },
  ],

  encode(values) {
    return [
      {
        target: TARGET,
        value: '0',
        signature: SIG,
        calldata: encodeAbiParameters(parseAbiParameters('string[]'), [
          parseColors(values.colors),
        ]),
      },
    ];
  },

  decode(actions, cursor) {
    const action = actions[cursor];
    if (!action) return null;
    if (!matchTarget(action, TARGET)) return null;
    if (!matchSignature(action, SIG)) return null;
    const args = decodeArgs<readonly [readonly string[]]>(
      action.calldata,
      'string[]',
    );
    if (!args) return null;
    return {
      values: { colors: args[0].join(', ') },
      consumed: 1,
    };
  },

  describe(values) {
    const colors = parseColors(values.colors);
    return [
      {
        title: `Add ${colors.length} background color${colors.length === 1 ? '' : 's'}`,
        functionName: 'addManyBackgrounds',
        params: { count: String(colors.length) },
      },
    ];
  },
};
