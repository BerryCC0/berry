/**
 * payer-repay-debt — 2-action multi: approve(USDC, Payer) + payBackDebt(amount).
 *
 * The Payer maintains a FIFO debt queue: when `sendOrRegisterDebt(...)` is
 * called and the Payer's USDC balance is insufficient, the unfulfilled amount
 * is queued. `payBackDebt(amount)` pulls USDC from the treasury (which must
 * have approved the Payer first) and pays out the front of the queue.
 *
 * First multi-action def — exercises the consumed > 1 code path.
 */

import { type Address, encodeAbiParameters, parseAbiParameters, parseUnits } from 'viem';
import {
  EXTERNAL_CONTRACTS,
  PAYER_ADDRESS,
} from '../../actionTemplates/constants';
import {
  addressEquals,
  decodeArgs,
  formatTokenAmount,
  matchSignature,
  multiActionId,
} from '../shared';
import type { ActionDescription, TransactionActionDef } from '../types';

interface Fields {
  /** USDC amount in display units (6-decimal). */
  usdcAmount: string;
}

const APPROVE_SIG = 'approve(address,uint256)';
const PAY_BACK_DEBT_SIG = 'payBackDebt(uint256)';
const USDC_DECIMALS = 6;

export const payerRepayDebt: TransactionActionDef<Fields> = {
  id: 'payer-repay-debt',
  category: 'treasury',
  name: 'Repay Payer Debt',
  description:
    "Send USDC to the Payer and clear queued debt entries — useful when bots haven't kept up with payouts",
  isMultiAction: true,
  fields: [
    {
      name: 'usdcAmount',
      label: 'USDC Amount',
      type: 'amount',
      placeholder: '0.0',
      required: true,
      validation: { min: 0, decimals: USDC_DECIMALS },
    },
  ],

  encode(values) {
    const amount = parseUnits(values.usdcAmount || '0', USDC_DECIMALS);
    const groupId = multiActionId('payer-repay-debt', values);
    return [
      {
        target: EXTERNAL_CONTRACTS.USDC.address,
        value: '0',
        signature: APPROVE_SIG,
        calldata: encodeAbiParameters(parseAbiParameters('address, uint256'), [
          PAYER_ADDRESS as Address,
          amount,
        ]),
        isPartOfMultiAction: true,
        multiActionGroupId: groupId,
        multiActionIndex: 0,
      },
      {
        target: PAYER_ADDRESS as Address,
        value: '0',
        signature: PAY_BACK_DEBT_SIG,
        calldata: encodeAbiParameters(parseAbiParameters('uint256'), [amount]),
        isPartOfMultiAction: true,
        multiActionGroupId: groupId,
        multiActionIndex: 1,
      },
    ];
  },

  decode(actions, cursor) {
    const approve = actions[cursor];
    const repay = actions[cursor + 1];
    if (!approve || !repay) return null;

    // 1st action: approve(Payer, amount) on USDC
    if (!addressEquals(approve.target, EXTERNAL_CONTRACTS.USDC.address)) return null;
    if (!matchSignature(approve, APPROVE_SIG)) return null;
    const approveArgs = decodeArgs<readonly [Address, bigint]>(
      approve.calldata,
      'address, uint256',
    );
    if (!approveArgs) return null;
    if (!addressEquals(approveArgs[0], PAYER_ADDRESS)) return null;

    // 2nd action: payBackDebt(amount) on Payer
    if (!addressEquals(repay.target, PAYER_ADDRESS)) return null;
    if (!matchSignature(repay, PAY_BACK_DEBT_SIG)) return null;
    const repayArgs = decodeArgs<readonly [bigint]>(repay.calldata, 'uint256');
    if (!repayArgs) return null;

    // The approve amount and the repay amount must match — otherwise this
    // isn't the matched pattern, it's two separate actions that happen to
    // line up. Let the per-action fallback decoder handle them individually.
    if (approveArgs[1] !== repayArgs[0]) return null;

    return {
      values: { usdcAmount: formatTokenAmount(repayArgs[0], USDC_DECIMALS) },
      consumed: 2,
    };
  },

  describe(values) {
    // One description per consumed action so the per-action UI lines up.
    // Approve gets the "permits" line; payBackDebt gets the "repays" line.
    const descriptions: ActionDescription[] = [
      {
        title: `Approve ${values.usdcAmount} USDC`,
        description: 'for the Payer to pull from treasury',
        functionName: 'approve',
        params: { spender: 'Payer', amount: values.usdcAmount },
      },
      {
        title: `Repay ${values.usdcAmount} USDC of Payer debt`,
        functionName: 'payBackDebt',
        params: { amount: values.usdcAmount },
      },
    ];
    return descriptions;
  },
};
