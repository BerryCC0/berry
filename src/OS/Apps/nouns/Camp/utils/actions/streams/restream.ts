/**
 * stream-restream — 4-action atomic re-stream:
 *   1. cancel() on source stream — snapshots recipient's vested share
 *   2. recoverTokens(treasury) — pulls unvested back to treasury
 *   3. createStream(...) — deploys the new stream clone at predicted addr
 *   4. transfer(predicted, amount) — treasury funds the new stream
 *
 * Routing recovery through the treasury (rather than directly to the new
 * stream's predicted address) lets the treasury absorb any small shortfall
 * caused by extra vesting during the voting window. Without this routing
 * the new stream would be silently under-funded.
 *
 * MUST be registered before stream-cancel and stream-redirect so the 4-action
 * sequence isn't broken up by them claiming the first 2 actions.
 */

import { type Address, parseUnits } from 'viem';
import { NOUNS_ADDRESSES } from '@/app/lib/nouns';
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
import type { TransactionActionDef } from '../types';
import {
  CANCEL_SIG,
  CREATE_STREAM_SIG,
  RECOVER_SIG,
  TRANSFER_SIG,
  dateInputToUnix,
  encodeCreateStream,
  encodeErc20Transfer,
  encodeRecoverTokens,
  unixToDateInput,
} from './_shared';

interface Fields {
  sourceStreamAddress: string;
  recipient: string;
  amount: string;
  /** Internal/editor field; not user-visible but round-tripped. */
  tokenAddress: string;
  startDate: string;
  endDate: string;
  /** Predicted CREATE2 address of the new (replacement) stream. */
  streamAddress: string;
}

const TREASURY = NOUNS_ADDRESSES.treasury as Address;

export const streamRestream: TransactionActionDef<Fields> = {
  id: 'stream-restream',
  category: 'streams',
  name: 'Re-stream',
  description:
    'Cancel an existing stream and replace it with a new one in a single proposal',
  isMultiAction: true,
  fields: [
    { name: 'sourceStreamAddress', label: 'Source Stream', type: 'stream-select', required: true },
    { name: 'recipient', label: 'New Recipient', type: 'address', required: true },
    { name: 'amount', label: 'New Total Amount', type: 'amount', required: true },
    { name: 'startDate', label: 'Start', type: 'date', required: true },
    { name: 'endDate', label: 'End', type: 'date', required: true },
    { name: 'streamAddress', label: 'Predicted New Stream', type: 'predicted-stream-address', required: true },
  ],

  encode(values) {
    const token = parseTokenSelectValue(values.tokenAddress, COMMON_TOKENS);
    if (!token) throw new Error('stream-restream: invalid token');
    const tokenAmount = parseUnits(values.amount || '0', token.decimals);
    const groupId = multiActionId('stream-restream', values);
    const source = values.sourceStreamAddress as Address;
    const predicted = values.streamAddress as Address;

    return [
      {
        target: source,
        value: '0',
        signature: CANCEL_SIG,
        calldata: '0x',
        isPartOfMultiAction: true,
        multiActionGroupId: groupId,
        multiActionIndex: 0,
      },
      {
        target: source,
        value: '0',
        signature: RECOVER_SIG,
        calldata: encodeRecoverTokens(TREASURY),
        isPartOfMultiAction: true,
        multiActionGroupId: groupId,
        multiActionIndex: 1,
      },
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
        multiActionIndex: 2,
      },
      {
        target: token.address,
        value: '0',
        signature: TRANSFER_SIG,
        calldata: encodeErc20Transfer(predicted, tokenAmount),
        isPartOfMultiAction: true,
        multiActionGroupId: groupId,
        multiActionIndex: 3,
      },
    ];
  },

  decode(actions, cursor) {
    const a = actions[cursor];
    const b = actions[cursor + 1];
    const c = actions[cursor + 2];
    const d = actions[cursor + 3];
    if (!a || !b || !c || !d) return null;

    // 1: cancel()
    if (!matchSignature(a, CANCEL_SIG)) return null;
    const source = a.target.toLowerCase();

    // 2: recoverTokens(treasury) on same target
    if (!matchSignature(b, RECOVER_SIG)) return null;
    if (b.target.toLowerCase() !== source) return null;
    const recoverArgs = decodeArgs<readonly [Address]>(b.calldata, 'address');
    if (!recoverArgs) return null;
    if (!addressEquals(recoverArgs[0], TREASURY)) return null;

    // 3: createStream on the StreamFactory
    if (!matchTarget(c, STREAM_FACTORY_ADDRESS)) return null;
    if (!matchSignature(c, CREATE_STREAM_SIG)) return null;
    const createArgs = decodeArgs<
      readonly [Address, bigint, Address, bigint, bigint, number, Address]
    >(c.calldata, 'address, uint256, address, uint256, uint256, uint8, address');
    if (!createArgs) return null;
    const [recipient, tokenAmount, tokenAddress, startTime, stopTime, , predicted] =
      createArgs;

    // 4: transfer(predicted, amount) on the token contract
    if (!matchTarget(d, tokenAddress)) return null;
    if (!matchSignature(d, TRANSFER_SIG)) return null;
    const transferArgs = decodeArgs<readonly [Address, bigint]>(
      d.calldata,
      'address, uint256',
    );
    if (!transferArgs) return null;
    if (!addressEquals(transferArgs[0], predicted)) return null;
    if (transferArgs[1] !== tokenAmount) return null;

    const knownToken = COMMON_TOKENS.find((t) =>
      addressEquals(t.address, tokenAddress),
    );
    const decimals = knownToken?.decimals ?? 18;

    return {
      values: {
        sourceStreamAddress: a.target,
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
      consumed: 4,
    };
  },

  describe(values) {
    const token = parseTokenSelectValue(values.tokenAddress);
    const symbol = token?.symbol ?? 'tokens';
    return [
      {
        title: 'Cancel old stream',
        functionName: 'cancel',
        params: { streamAddress: values.sourceStreamAddress },
      },
      {
        title: 'Recover unvested funds',
        description: 'to treasury',
        functionName: 'recoverTokens',
      },
      {
        title: `Create new ${values.amount} ${symbol} stream`,
        description: `to ${values.recipient}`,
        functionName: 'createStream',
        params: { recipient: values.recipient, amount: values.amount, token: symbol },
      },
      {
        title: `Fund new stream with ${values.amount} ${symbol}`,
        functionName: 'transfer',
        params: { amount: values.amount, token: symbol },
      },
    ];
  },
};
