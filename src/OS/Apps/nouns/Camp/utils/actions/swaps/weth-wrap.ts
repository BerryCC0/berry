/**
 * weth-wrap — single-action `WETH.deposit{value: amount}()`.
 *
 * Converts the treasury's ETH into the ERC-20 WETH representation. No
 * slippage, no DEX involvement — WETH is a 1:1 wrapped contract that mints
 * exactly `value` WETH for the ETH it receives.
 *
 * Common reason to use this: OpenSea bids must be denominated in WETH (you
 * can't bid ETH on OpenSea). The treasury holds lots of auction ETH, so the
 * natural setup for `opensea-collection-offer` / `opensea-item-offer` is to
 * include a wrap action in the same proposal.
 *
 * MUST be registered before `treasury-transfer` in `registry.ts` so the
 * generic ETH-transfer matcher doesn't claim it first — though in practice
 * the `signature: 'deposit()'` discriminator already protects us.
 */

import { type Address, parseEther } from 'viem';
import { EXTERNAL_CONTRACTS } from '../../actionTemplates/constants';
import { addressEquals, formatTokenAmount } from '../shared';
import type { TransactionActionDef } from '../types';

interface Fields {
  /** ETH amount, in human display units (e.g. "5" for 5 ETH = 5 WETH out). */
  ethAmount: string;
}

const WETH = EXTERNAL_CONTRACTS.WETH.address;
const DEPOSIT_SIG = 'deposit()';

export const wethWrap: TransactionActionDef<Fields> = {
  id: 'weth-wrap',
  category: 'swaps',
  name: 'Wrap ETH → WETH',
  description:
    "Convert the treasury's ETH into WETH (1:1, no slippage). Required to bid on OpenSea or any other WETH-only market.",
  isMultiAction: false,
  fields: [
    {
      name: 'ethAmount',
      label: 'ETH Amount',
      type: 'amount',
      placeholder: '0.0',
      required: true,
      validation: { min: 0, decimals: 18 },
      helpText: 'Amount of ETH to wrap. You will receive an equal amount of WETH.',
    },
  ],

  encode(values) {
    return [
      {
        target: WETH as Address,
        value: parseEther(values.ethAmount || '0').toString(),
        signature: DEPOSIT_SIG,
        calldata: '0x',
      },
    ];
  },

  decode(actions, cursor) {
    const action = actions[cursor];
    if (!action) return null;
    if (!addressEquals(action.target, WETH)) return null;
    if (action.signature !== DEPOSIT_SIG) return null;
    if (action.calldata && action.calldata !== '0x') return null;
    if (!action.value || action.value === '0') return null;
    return {
      values: { ethAmount: formatTokenAmount(BigInt(action.value), 18) },
      consumed: 1,
    };
  },

  describe(values) {
    return [
      {
        title: `Wrap ${values.ethAmount} ETH → WETH`,
        description: 'Mints an equal amount of WETH to the treasury (1:1)',
        functionName: 'deposit',
        params: { value: values.ethAmount },
      },
    ];
  },
};
