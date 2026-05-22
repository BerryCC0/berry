/**
 * stream-cancel — `cancel() + recoverTokens(treasury)` pair on a stream.
 *
 * `cancel()` alone only snapshots the recipient's vested share; the unvested
 * remainder stays locked in the stream until the payer calls
 * `recoverTokens(to)`. We always bundle the recovery to avoid stranded funds.
 *
 * Distinguished from `stream-redirect` by the recovery destination: treasury
 * for cancel, anything else for redirect.
 *
 * Order with `stream-restream` matters: the first 2 actions of a restream
 * are byte-identical to a stream-cancel. The restream matcher MUST be
 * registered first so it claims the full 4-action sequence before this def
 * sees only the prefix.
 */

import { type Address } from 'viem';
import { NOUNS_ADDRESSES } from '@/app/lib/nouns';
import {
  addressEquals,
  decodeArgs,
  matchSignature,
  multiActionId,
} from '../shared';
import type { ActionDescription, TransactionActionDef } from '../types';
import {
  CANCEL_SIG,
  RECOVER_SIG,
  encodeRecoverTokens,
  matchCancelAndRecover,
} from './_shared';

interface Fields {
  streamAddress: string;
}

const TREASURY = NOUNS_ADDRESSES.treasury as Address;

export const streamCancel: TransactionActionDef<Fields> = {
  id: 'stream-cancel',
  category: 'streams',
  name: 'Cancel Stream',
  description:
    'Cancel an active payment stream and return unvested funds to the treasury',
  isMultiAction: true,
  fields: [
    {
      name: 'streamAddress',
      label: 'Stream Address',
      type: 'stream-select',
      required: true,
    },
  ],

  encode(values) {
    const groupId = multiActionId('stream-cancel', values);
    const streamAddress = values.streamAddress as Address;
    return [
      {
        target: streamAddress,
        value: '0',
        signature: CANCEL_SIG,
        calldata: '0x',
        isPartOfMultiAction: true,
        multiActionGroupId: groupId,
        multiActionIndex: 0,
      },
      {
        target: streamAddress,
        value: '0',
        signature: RECOVER_SIG,
        calldata: encodeRecoverTokens(TREASURY),
        isPartOfMultiAction: true,
        multiActionGroupId: groupId,
        multiActionIndex: 1,
      },
    ];
  },

  decode(actions, cursor) {
    const shape = matchCancelAndRecover(actions, cursor, decodeArgs);
    if (!shape) return null;
    if (!addressEquals(shape.destination, TREASURY)) return null;
    return {
      values: { streamAddress: shape.streamAddress },
      consumed: 2,
    };
  },

  describe(values) {
    const descriptions: ActionDescription[] = [
      {
        title: 'Cancel stream',
        description: `at ${values.streamAddress}`,
        functionName: 'cancel',
        params: { streamAddress: values.streamAddress },
      },
      {
        title: 'Recover unvested funds',
        description: 'to treasury',
        functionName: 'recoverTokens',
        params: { destination: 'Treasury' },
      },
    ];
    // matchSignature is unused here; the matcher in _shared.ts does the work.
    void matchSignature;
    return descriptions;
  },
};
