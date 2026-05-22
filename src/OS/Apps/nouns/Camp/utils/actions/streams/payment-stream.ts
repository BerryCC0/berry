/**
 * payment-stream — 2-action: createStream(...) on the StreamFactory +
 * transfer(predicted, amount) on the token. Funds a new linear-vesting
 * payment stream from the treasury.
 *
 * The `streamAddress` field is set by the editor via predicted-address
 * computation (CREATE2 with deterministic salt). Round-trip preserves it.
 */

import { type Address, parseUnits } from 'viem';
import {
  COMMON_TOKENS,
  STREAM_FACTORY_ADDRESS,
} from '../../actionTemplates/constants';
import {
  addressEquals,
  decodeArgs,
  formatTokenAmount,
  matchSignature,
  matchTarget,
  multiActionId,
  parseTokenSelectValue,
  stringifyTokenSelectValue,
} from '../shared';
import type { ProposalAction, TransactionActionDef } from '../types';
import {
  CREATE_STREAM_SIG,
  TRANSFER_SIG,
  dateInputToUnix,
  encodeCreateStream,
  encodeErc20Transfer,
  unixToDateInput,
} from './_shared';

interface Fields {
  recipient: string;
  amount: string;
  /** Token-select payload (JSON-stringified). The legacy template uses
   *  `tokenAddress` for this field — kept verbatim for compatibility. */
  tokenAddress: string;
  /** YYYY-MM-DDTHH:mm local time. */
  startDate: string;
  endDate: string;
  /** Predicted CREATE2 address of the new stream. */
  streamAddress: string;
}

export const paymentStream: TransactionActionDef<Fields> = {
  id: 'payment-stream',
  category: 'streams',
  name: 'Create Payment Stream',
  description:
    'Linear-vesting stream from the treasury to a recipient over a chosen window',
  isMultiAction: true,
  fields: [
    { name: 'recipient', label: 'Recipient', type: 'address', required: true },
    { name: 'amount', label: 'Total Amount', type: 'amount', required: true },
    { name: 'tokenAddress', label: 'Token', type: 'token-select', required: true },
    { name: 'startDate', label: 'Start', type: 'date', required: true },
    { name: 'endDate', label: 'End', type: 'date', required: true },
    {
      name: 'streamAddress',
      label: 'Predicted Stream Address',
      type: 'predicted-stream-address',
      required: true,
    },
  ],

  encode(values) {
    const token = parseTokenSelectValue(values.tokenAddress, COMMON_TOKENS);
    if (!token) throw new Error('payment-stream: invalid token');
    const tokenAmount = parseUnits(values.amount || '0', token.decimals);
    const groupId = multiActionId('payment-stream', values);
    const predicted = values.streamAddress as Address;

    return [
      {
        target: STREAM_FACTORY_ADDRESS as Address,
        value: '0',
        signature: CREATE_STREAM_SIG,
        calldata: encodeCreateStream({
          recipient: values.recipient as Address,
          tokenAmount,
          tokenAddress: token.address,
          startTime: dateInputToUnix(values.startDate),
          stopTime: dateInputToUnix(values.endDate),
          nonce: 0,
          predictedStreamAddress: predicted,
        }),
        isPartOfMultiAction: true,
        multiActionGroupId: groupId,
        multiActionIndex: 0,
      },
      {
        target: token.address,
        value: '0',
        signature: TRANSFER_SIG,
        calldata: encodeErc20Transfer(predicted, tokenAmount),
        isPartOfMultiAction: true,
        multiActionGroupId: groupId,
        multiActionIndex: 1,
      },
    ];
  },

  decode(actions, cursor) {
    const create = actions[cursor];
    const fund = actions[cursor + 1];
    if (!create || !fund) return null;
    if (!matchTarget(create, STREAM_FACTORY_ADDRESS)) return null;
    if (!matchSignature(create, CREATE_STREAM_SIG)) return null;
    if (!matchSignature(fund, TRANSFER_SIG)) return null;

    const createArgs = decodeArgs<
      readonly [Address, bigint, Address, bigint, bigint, number, Address]
    >(create.calldata, 'address, uint256, address, uint256, uint256, uint8, address');
    if (!createArgs) return null;
    const [recipient, tokenAmount, tokenAddress, startTime, stopTime, , predicted] =
      createArgs;

    // Funding leg must transfer to the predicted address on the same token.
    if (!matchTarget(fund, tokenAddress)) return null;
    const fundArgs = decodeArgs<readonly [Address, bigint]>(
      fund.calldata,
      'address, uint256',
    );
    if (!fundArgs) return null;
    if (!addressEquals(fundArgs[0], predicted)) return null;
    if (fundArgs[1] !== tokenAmount) return null;

    const knownToken = COMMON_TOKENS.find((t) =>
      addressEquals(t.address, tokenAddress),
    );
    const decimals = knownToken?.decimals ?? 18;

    return {
      values: {
        recipient,
        amount: formatTokenAmount(tokenAmount, decimals),
        tokenAddress: stringifyTokenSelectValue({
          symbol: knownToken?.symbol ?? tokenAddress,
          address: tokenAddress,
          decimals,
          isNative: false,
        }),
        startDate: unixToDateInput(startTime),
        endDate: unixToDateInput(stopTime),
        streamAddress: predicted,
      },
      consumed: 2,
    };
    void ({} as ProposalAction);
  },

  describe(values) {
    const token = parseTokenSelectValue(values.tokenAddress);
    const symbol = token?.symbol ?? 'tokens';
    return [
      {
        title: `Create ${values.amount} ${symbol} stream`,
        description: `to ${values.recipient}`,
        functionName: 'createStream',
        params: { ...values, token: symbol },
      },
      {
        title: `Fund stream with ${values.amount} ${symbol}`,
        functionName: 'transfer',
        params: { amount: values.amount, token: symbol },
      },
    ];
  },
};
