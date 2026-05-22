/**
 * swap-buy-eth — 2-action: approve(USDC, TokenBuyer) + buyETH(usdcAmount).
 *
 * The TokenBuyer pulls the USDC via transferFrom and returns ETH at oracle
 * price (minus the bot discount). This is the treasury's main "trade USDC
 * for ETH at fair market" lever.
 */

import { type Address, encodeAbiParameters, parseAbiParameters, parseUnits } from 'viem';
import {
  EXTERNAL_CONTRACTS,
  TOKEN_BUYER_ADDRESS,
} from '../../actionTemplates/constants';
import {
  addressEquals,
  decodeArgs,
  formatTokenAmount,
  matchSignature,
  matchTarget,
  multiActionId,
} from '../shared';
import type { ActionDescription, TransactionActionDef } from '../types';

interface Fields {
  usdcAmount: string;
}

const APPROVE_SIG = 'approve(address,uint256)';
const BUY_ETH_SIG = 'buyETH(uint256)';
const USDC_DECIMALS = 6;

export const swapBuyEth: TransactionActionDef<Fields> = {
  id: 'swap-buy-eth',
  category: 'swaps',
  name: 'Buy ETH (TokenBuyer)',
  description:
    'Swap treasury USDC for ETH at oracle price via the TokenBuyer (with bot discount)',
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
    const groupId = multiActionId('swap-buy-eth', values);
    return [
      {
        target: EXTERNAL_CONTRACTS.USDC.address,
        value: '0',
        signature: APPROVE_SIG,
        calldata: encodeAbiParameters(parseAbiParameters('address, uint256'), [
          TOKEN_BUYER_ADDRESS as Address,
          amount,
        ]),
        isPartOfMultiAction: true,
        multiActionGroupId: groupId,
        multiActionIndex: 0,
      },
      {
        target: TOKEN_BUYER_ADDRESS as Address,
        value: '0',
        signature: BUY_ETH_SIG,
        calldata: encodeAbiParameters(parseAbiParameters('uint256'), [amount]),
        isPartOfMultiAction: true,
        multiActionGroupId: groupId,
        multiActionIndex: 1,
      },
    ];
  },

  decode(actions, cursor) {
    const approve = actions[cursor];
    const buy = actions[cursor + 1];
    if (!approve || !buy) return null;

    if (!matchTarget(approve, EXTERNAL_CONTRACTS.USDC.address)) return null;
    if (!matchSignature(approve, APPROVE_SIG)) return null;
    const approveArgs = decodeArgs<readonly [Address, bigint]>(
      approve.calldata,
      'address, uint256',
    );
    if (!approveArgs) return null;
    if (!addressEquals(approveArgs[0], TOKEN_BUYER_ADDRESS)) return null;

    if (!matchTarget(buy, TOKEN_BUYER_ADDRESS)) return null;
    if (!matchSignature(buy, BUY_ETH_SIG)) return null;
    const buyArgs = decodeArgs<readonly [bigint]>(buy.calldata, 'uint256');
    if (!buyArgs) return null;
    if (buyArgs[0] !== approveArgs[1]) return null;

    return {
      values: { usdcAmount: formatTokenAmount(buyArgs[0], USDC_DECIMALS) },
      consumed: 2,
    };
  },

  describe(values) {
    const descriptions: ActionDescription[] = [
      {
        title: `Approve ${values.usdcAmount} USDC`,
        description: 'for the TokenBuyer to swap to ETH',
        functionName: 'approve',
        params: { spender: 'TokenBuyer', amount: values.usdcAmount },
      },
      {
        title: `Buy ETH with ${values.usdcAmount} USDC`,
        functionName: 'buyETH',
        params: { usdcAmount: values.usdcAmount },
      },
    ];
    return descriptions;
  },
};
