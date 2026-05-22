/**
 * admin-dynamic-quorum — `_setDynamicQuorumParams(uint16, uint16, uint32)`.
 * Three-arg setter that updates min quorum, max quorum, and coefficient
 * atomically. Doesn't fit makeUintAction (single field) — own file.
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
  minBps: string;
  maxBps: string;
  coefficient: string;
}

const SIG = '_setDynamicQuorumParams(uint16,uint16,uint32)';
const DAO_PROXY = NOUNS_ADDRESSES.governor as Address;

export const adminDynamicQuorum: TransactionActionDef<Fields> = {
  id: 'admin-dynamic-quorum',
  category: 'governance-admin',
  name: 'Set Dynamic Quorum Params',
  description: 'Min/max quorum thresholds and the slope coefficient between them',
  isMultiAction: false,
  fields: [
    { name: 'minBps', label: 'Min Quorum (BPS)', type: 'number', required: true },
    { name: 'maxBps', label: 'Max Quorum (BPS)', type: 'number', required: true },
    { name: 'coefficient', label: 'Coefficient', type: 'number', required: true },
  ],

  encode(values) {
    return [
      {
        target: DAO_PROXY,
        value: '0',
        signature: SIG,
        calldata: encodeAbiParameters(
          parseAbiParameters('uint16, uint16, uint32'),
          [
            Number(values.minBps || '0'),
            Number(values.maxBps || '0'),
            Number(values.coefficient || '0'),
          ],
        ),
      },
    ];
  },

  decode(actions, cursor) {
    const action = actions[cursor];
    if (!action) return null;
    if (!matchTarget(action, DAO_PROXY)) return null;
    if (!matchSignature(action, SIG)) return null;
    const args = decodeArgs<readonly [number, number, number]>(
      action.calldata,
      'uint16, uint16, uint32',
    );
    if (!args) return null;
    return {
      values: {
        minBps: args[0].toString(),
        maxBps: args[1].toString(),
        coefficient: args[2].toString(),
      },
      consumed: 1,
    };
  },

  describe(values) {
    return [
      {
        title: `Dynamic quorum: ${values.minBps}-${values.maxBps} BPS, coef ${values.coefficient}`,
        functionName: '_setDynamicQuorumParams',
        params: { ...values },
      },
    ];
  },
};
