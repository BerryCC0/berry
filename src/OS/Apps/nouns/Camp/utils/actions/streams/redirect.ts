/**
 * stream-redirect — `cancel() + recoverTokens(destination)` where the
 * destination is NOT the treasury. Used to redirect a stream to a different
 * recipient mid-flight.
 *
 * See stream-cancel.ts for the ordering caveat with stream-restream.
 */

import { type Address } from 'viem';
import { NOUNS_ADDRESSES } from '@/app/lib/nouns';
import {
  addressEquals,
  decodeArgs,
  multiActionId,
} from '../shared';
import type { TransactionActionDef } from '../types';
import {
  CANCEL_SIG,
  RECOVER_SIG,
  encodeRecoverTokens,
  matchCancelAndRecover,
} from './_shared';

interface Fields {
  streamAddress: string;
  destination: string;
}

const TREASURY = NOUNS_ADDRESSES.treasury as Address;

export const streamRedirect: TransactionActionDef<Fields> = {
  id: 'stream-redirect',
  category: 'streams',
  name: 'Redirect Stream',
  description: 'Cancel a stream and route the unvested funds to a different address',
  isMultiAction: true,
  fields: [
    {
      name: 'streamAddress',
      label: 'Stream Address',
      type: 'stream-select',
      required: true,
    },
    {
      name: 'destination',
      label: 'New Destination',
      type: 'address',
      placeholder: '0x... or name.eth',
      required: true,
    },
  ],

  encode(values) {
    const groupId = multiActionId('stream-redirect', values);
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
        calldata: encodeRecoverTokens(values.destination as Address),
        isPartOfMultiAction: true,
        multiActionGroupId: groupId,
        multiActionIndex: 1,
      },
    ];
  },

  decode(actions, cursor) {
    const shape = matchCancelAndRecover(actions, cursor, decodeArgs);
    if (!shape) return null;
    // Redirect is everything that's NOT to the treasury — that's stream-cancel.
    if (addressEquals(shape.destination, TREASURY)) return null;
    return {
      values: {
        streamAddress: shape.streamAddress,
        destination: shape.destination,
      },
      consumed: 2,
    };
  },

  describe(values) {
    return [
      {
        title: 'Cancel stream',
        description: `at ${values.streamAddress}`,
        functionName: 'cancel',
        params: { streamAddress: values.streamAddress },
      },
      {
        title: 'Redirect unvested funds',
        description: `to ${values.destination}`,
        functionName: 'recoverTokens',
        params: { destination: values.destination },
      },
    ];
  },
};
