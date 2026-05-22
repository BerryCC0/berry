/**
 * payment-once — one-time USDC payment via the DAO Payer contract. If the
 * Payer is funded, the recipient gets the USDC immediately; if not, the
 * Payer registers a debt entry and pays out when bots refill it.
 *
 * Single on-chain action: target=Payer, sig=sendOrRegisterDebt(address,uint256).
 *
 * Note: the legacy parser had no matcher for this — `sendOrRegisterDebt`
 * actions decoded as `custom`. Migrating it here closes that gap.
 */

import { type Address, encodeAbiParameters, parseAbiParameters, parseUnits } from 'viem';
import { PAYER_ADDRESS } from '../../actionTemplates/constants';
import {
  addressEquals,
  decodeArgs,
  formatTokenAmount,
  matchSignature,
} from '../shared';
import type { TransactionActionDef } from '../types';

interface Fields {
  recipient: string;
  /** USDC amount in display units (6-decimal). */
  amount: string;
}

const SEND_OR_REGISTER_DEBT_SIG = 'sendOrRegisterDebt(address,uint256)';
const USDC_DECIMALS = 6;

export const paymentOnce: TransactionActionDef<Fields> = {
  id: 'payment-once',
  category: 'treasury',
  name: 'Pay via USDC Payer',
  description:
    'Send USDC through the DAO Payer contract — registers debt if reserves are low instead of reverting',
  isMultiAction: false,
  fields: [
    {
      name: 'recipient',
      label: 'Recipient Address',
      type: 'address',
      placeholder: '0x... or ENS name',
      required: true,
    },
    {
      name: 'amount',
      label: 'Amount (USDC)',
      type: 'amount',
      placeholder: '0.0',
      required: true,
      validation: { min: 0, decimals: USDC_DECIMALS },
    },
  ],

  encode(values) {
    const amount = parseUnits(values.amount || '0', USDC_DECIMALS);
    return [
      {
        target: PAYER_ADDRESS as Address,
        value: '0',
        signature: SEND_OR_REGISTER_DEBT_SIG,
        calldata: encodeAbiParameters(parseAbiParameters('address, uint256'), [
          values.recipient as Address,
          amount,
        ]),
      },
    ];
  },

  decode(actions, cursor) {
    const action = actions[cursor];
    if (!action) return null;
    if (!matchSignature(action, SEND_OR_REGISTER_DEBT_SIG)) return null;
    if (!addressEquals(action.target, PAYER_ADDRESS)) return null;

    const args = decodeArgs<readonly [Address, bigint]>(
      action.calldata,
      'address, uint256',
    );
    if (!args) return null;
    return {
      values: {
        recipient: args[0],
        amount: formatTokenAmount(args[1], USDC_DECIMALS),
      },
      consumed: 1,
    };
  },

  describe(values) {
    return [
      {
        title: `Pay ${values.amount} USDC via Payer`,
        description: `to ${values.recipient}`,
        functionName: 'sendOrRegisterDebt',
        params: { recipient: values.recipient, amount: values.amount },
      },
    ];
  },
};
