/**
 * admin-rewards-client-approval — `setClientApproval(uint32 clientId, bool approved)`.
 */

import { encodeAbiParameters, parseAbiParameters, type Address } from 'viem';
import { CLIENT_REWARDS_ADDRESS } from '../../actionTemplates/constants';
import {
  decodeArgs,
  matchSignature,
  matchTarget,
} from '../shared';
import type { TransactionActionDef } from '../types';

interface Fields {
  clientId: string;
  /** Stored as the string 'true' or 'false' to match the legacy form shape. */
  approved: string;
}

const SIG = 'setClientApproval(uint32,bool)';
const TARGET = CLIENT_REWARDS_ADDRESS as Address;

export const adminRewardsClientApproval: TransactionActionDef<Fields> = {
  id: 'admin-rewards-client-approval',
  category: 'rewards-admin',
  name: 'Approve / Disapprove Client',
  description: 'Flip the approval flag for a registered client ID',
  isMultiAction: false,
  fields: [
    { name: 'clientId', label: 'Client ID', type: 'number', required: true },
    {
      name: 'approved',
      label: 'Approved',
      type: 'select',
      required: true,
      options: [
        { label: 'Approved', value: 'true' },
        { label: 'Not approved', value: 'false' },
      ],
    },
  ],

  encode(values) {
    return [
      {
        target: TARGET,
        value: '0',
        signature: SIG,
        calldata: encodeAbiParameters(parseAbiParameters('uint32, bool'), [
          Number(values.clientId || '0'),
          values.approved === 'true',
        ]),
      },
    ];
  },

  decode(actions, cursor) {
    const action = actions[cursor];
    if (!action) return null;
    if (!matchTarget(action, TARGET)) return null;
    if (!matchSignature(action, SIG)) return null;
    const args = decodeArgs<readonly [number, boolean]>(
      action.calldata,
      'uint32, bool',
    );
    if (!args) return null;
    return {
      values: {
        clientId: args[0].toString(),
        approved: args[1] ? 'true' : 'false',
      },
      consumed: 1,
    };
  },

  describe(values) {
    return [
      {
        title: `${values.approved === 'true' ? 'Approve' : 'Disapprove'} client #${values.clientId}`,
        functionName: 'setClientApproval',
        params: { ...values },
      },
    ];
  },
};
