/**
 * treasury-transfer — unified ETH + ERC-20 send from the Nouns treasury.
 *
 * The treasury executes proposals as msg.sender:
 *   • ETH transfer    → action with empty signature + non-zero value
 *   • ERC-20 transfer → action targeting the token contract with
 *                       `transfer(address,uint256)` calldata
 *
 * This module owns the full lifecycle for both variants — replaces the
 * legacy generator.ts:278-306 + parser.ts:234-292 + transactionDecoder.ts
 * (ETH-transfer + ERC-20 transfer cases) for this action id.
 */

import { type Address, encodeAbiParameters, parseAbiParameters, parseUnits } from 'viem';
import { NOUNS_ADDRESSES } from '@/app/lib/nouns';
import { COMMON_TOKENS } from '../../actionTemplates/constants';
import {
  addressEquals,
  decodeArgs,
  ETH_ADDRESS,
  formatTokenAmount,
  isNativeEth,
  matchSignature,
  parseTokenSelectValue,
  stringifyTokenSelectValue,
} from '../shared';
import type {
  ActionDescription,
  DecodeMatch,
  ProposalAction,
  TransactionActionDef,
} from '../types';

/** Field values for the treasury-transfer form. */
interface TreasuryTransferFields {
  /** JSON-stringified TokenSelectValue; see shared/tokenSelect. */
  token: string;
  /** Recipient address (or ENS name pre-resolved by the editor). */
  recipient: string;
  /** Human-entered amount in the token's display decimals. */
  amount: string;
}

const TRANSFER_SIG = 'transfer(address,uint256)';

export const treasuryTransfer: TransactionActionDef<TreasuryTransferFields> = {
  id: 'treasury-transfer',
  category: 'treasury',
  name: 'Pay via Treasury',
  description:
    'Send ETH or any ERC-20 token directly from the treasury to a recipient',
  isMultiAction: false,
  fields: [
    {
      name: 'token',
      label: 'Token',
      type: 'treasury-token-select',
      required: true,
      helpText: 'Pick from treasury holdings',
    },
    {
      name: 'recipient',
      label: 'Recipient',
      type: 'address',
      placeholder: '0x... or name.eth',
      required: true,
    },
    {
      name: 'amount',
      label: 'Amount',
      type: 'amount',
      placeholder: '0.0',
      required: true,
      validation: { min: 0 },
    },
  ],

  encode(values): ProposalAction[] {
    const token = parseTokenSelectValue(values.token, COMMON_TOKENS);
    if (!token) {
      throw new Error('treasury-transfer: invalid token field');
    }
    const amount = parseUnits(values.amount || '0', token.decimals);
    const recipient = values.recipient as Address;

    if (token.isNative || isNativeEth(token.address)) {
      // Direct ETH transfer — treasury sends ETH to the recipient by setting
      // the action's `value` field; no calldata.
      return [
        {
          target: recipient,
          value: amount.toString(),
          signature: '',
          calldata: '0x',
        },
      ];
    }

    // ERC-20 transfer — call `transfer(recipient, amount)` on the token.
    // Treasury is msg.sender, so we don't need transferFrom.
    return [
      {
        target: token.address,
        value: '0',
        signature: TRANSFER_SIG,
        calldata: encodeAbiParameters(
          parseAbiParameters('address, uint256'),
          [recipient, amount],
        ),
      },
    ];
  },

  decode(actions, cursor): DecodeMatch<TreasuryTransferFields> | null {
    const action = actions[cursor];
    if (!action) return null;

    // ETH variant: empty signature, empty calldata, non-zero value.
    // Specialised targets (TokenBuyer refill, fork escrow deposit, etc.) are
    // owned by more-specific action defs registered ahead of this one in
    // registry.ts — first-match-wins ensures they claim before we get here.
    if (
      !action.signature &&
      (!action.calldata || action.calldata === '0x') &&
      action.value &&
      action.value !== '0'
    ) {
      return {
        values: {
          token: stringifyTokenSelectValue({
            symbol: 'ETH',
            address: ETH_ADDRESS as Address,
            decimals: 18,
            isNative: true,
          }),
          recipient: action.target,
          amount: formatTokenAmount(BigInt(action.value), 18),
        },
        consumed: 1,
      };
    }

    // Legacy ETH variant: `sendETH(address,uint256)` on the treasury (kept
    // for backwards compatibility with very old proposals).
    if (
      addressEquals(action.target, NOUNS_ADDRESSES.treasury) &&
      matchSignature(action, 'sendETH(address,uint256)')
    ) {
      const args = decodeArgs<readonly [Address, bigint]>(
        action.calldata,
        'address, uint256',
      );
      if (args) {
        return {
          values: {
            token: stringifyTokenSelectValue({
              symbol: 'ETH',
              address: ETH_ADDRESS as Address,
              decimals: 18,
              isNative: true,
            }),
            recipient: args[0],
            amount: formatTokenAmount(args[1], 18),
          },
          consumed: 1,
        };
      }
    }

    // ERC-20 variant: target is the token contract; signature is `transfer`.
    // The token's symbol/decimals come from COMMON_TOKENS or default to 18.
    if (matchSignature(action, TRANSFER_SIG)) {
      const args = decodeArgs<readonly [Address, bigint]>(
        action.calldata,
        'address, uint256',
      );
      if (!args) return null;
      const tokenAddress = action.target as Address;
      const knownToken = COMMON_TOKENS.find((t) =>
        addressEquals(t.address, tokenAddress),
      );
      const decimals = knownToken?.decimals ?? 18;
      return {
        values: {
          token: stringifyTokenSelectValue({
            symbol: knownToken?.symbol ?? tokenAddress,
            address: tokenAddress,
            decimals,
            isNative: false,
          }),
          recipient: args[0],
          amount: formatTokenAmount(args[1], decimals),
        },
        consumed: 1,
      };
    }

    return null;
  },

  describe(values, actions, ctx): ActionDescription[] {
    const action = actions[0];
    const token = parseTokenSelectValue(values.token, COMMON_TOKENS);
    const symbol = token?.symbol ?? 'tokens';
    const decimals = token?.decimals ?? 18;

    // Resolve dynamic token metadata for unknown ERC-20s (the consuming hook
    // fetches symbol/decimals on-chain and stuffs them in ctx.tokens).
    const dynamic =
      token && !token.isNative
        ? ctx.tokens.get(token.address.toLowerCase())
        : undefined;
    const displaySymbol = dynamic?.symbol ?? symbol;
    const displayDecimals = dynamic?.decimals ?? decimals;

    // Re-derive the on-chain amount from the action so the displayed number
    // matches the actual transfer (rather than re-parsing the form's string).
    let rawAmount = BigInt(0);
    if (token?.isNative) {
      rawAmount = BigInt(action.value || '0');
    } else {
      const args = decodeArgs<readonly [Address, bigint]>(
        action.calldata,
        'address, uint256',
      );
      if (args) rawAmount = args[1];
    }

    const amountDisplay = formatTokenAmount(rawAmount, displayDecimals);
    const functionName = token?.isNative ? 'transfer' : 'transfer';

    return [
      {
        title: `Send ${amountDisplay} ${displaySymbol}`,
        description: `to ${values.recipient}`,
        functionName,
        params: {
          recipient: values.recipient,
          amount: amountDisplay,
          token: displaySymbol,
        },
      },
    ];
  },
};
