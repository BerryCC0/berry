/**
 * swap-cowswap — `setPreSignature(orderUid, true)` on CoW Protocol settlement.
 *
 * Pre-signs an off-chain order so CoW solvers can execute it on the
 * treasury's behalf. The order itself lives off-chain; this action just
 * authorises it.
 */

import { encodeAbiParameters, parseAbiParameters, type Address, type Hex } from 'viem';
import { COWSWAP_SETTLEMENT_ADDRESS } from '../../actionTemplates/constants';
import {
  decodeArgs,
  matchSignature,
  matchTarget,
} from '../shared';
import type { TransactionActionDef } from '../types';

interface Fields {
  orderUid: string;
}

const SIG = 'setPreSignature(bytes,bool)';
const TARGET = COWSWAP_SETTLEMENT_ADDRESS as Address;

export const swapCowswap: TransactionActionDef<Fields> = {
  id: 'swap-cowswap',
  category: 'swaps',
  name: 'Pre-sign CoW Order',
  description: 'Authorize a CoW Protocol order on behalf of the treasury',
  isMultiAction: false,
  fields: [
    {
      name: 'orderUid',
      label: 'Order UID',
      type: 'text',
      placeholder: '0x...',
      required: true,
      helpText: 'Pre-built order UID from the CoW API',
    },
  ],

  encode(values) {
    return [
      {
        target: TARGET,
        value: '0',
        signature: SIG,
        calldata: encodeAbiParameters(parseAbiParameters('bytes, bool'), [
          (values.orderUid || '0x') as Hex,
          true,
        ]),
      },
    ];
  },

  decode(actions, cursor) {
    const action = actions[cursor];
    if (!action) return null;
    if (!matchTarget(action, TARGET)) return null;
    if (!matchSignature(action, SIG)) return null;
    const args = decodeArgs<readonly [Hex, boolean]>(
      action.calldata,
      'bytes, bool',
    );
    if (!args) return null;
    return {
      values: { orderUid: args[0] },
      consumed: 1,
    };
  },

  describe(values) {
    return [
      {
        title: 'Pre-sign CoW Protocol order',
        description: values.orderUid.slice(0, 18) + '…',
        functionName: 'setPreSignature',
        params: { orderUid: values.orderUid },
      },
    ];
  },
};
