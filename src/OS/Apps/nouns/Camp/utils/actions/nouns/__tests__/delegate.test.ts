import { describe, it, expect } from 'vitest';
import { encodeAbiParameters, parseAbiParameters } from 'viem';
import { nounDelegate } from '../delegate';
import { NOUNS_ADDRESSES } from '@/app/lib/nouns';
import {
  assertNoMatch,
  assertRoundTrip,
} from '../../__tests__/roundTrip';

const DELEGATEE = '0x1234567890abcdef1234567890abcdef12345678';
const RANDOM_TOKEN = '0xC18360217D8F7Ab5e7c516566761Ea12Ce7F9D72';

describe('noun-delegate', () => {
  it('encodes delegate() on the Nouns token', () => {
    const [action] = nounDelegate.encode({ delegatee: DELEGATEE }, {});
    expect(action.target).toBe(NOUNS_ADDRESSES.token);
    expect(action.signature).toBe('delegate(address)');
  });

  it('round-trips', () => {
    assertRoundTrip(nounDelegate, { delegatee: DELEGATEE });
  });

  it('does not claim delegate() on other tokens (those are treasury-delegate)', () => {
    assertNoMatch(nounDelegate, [
      {
        target: RANDOM_TOKEN,
        value: '0',
        signature: 'delegate(address)',
        calldata: encodeAbiParameters(parseAbiParameters('address'), [
          DELEGATEE,
        ]),
      },
    ]);
  });
});
