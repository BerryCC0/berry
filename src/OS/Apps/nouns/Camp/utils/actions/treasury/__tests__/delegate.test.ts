import { describe, it, expect } from 'vitest';
import { encodeAbiParameters, parseAbiParameters } from 'viem';
import { treasuryDelegate } from '../delegate';
import { NOUNS_ADDRESSES } from '@/app/lib/nouns';
import {
  assertNoMatch,
  assertRoundTrip,
} from '../../__tests__/roundTrip';

const ENS_TOKEN = '0xC18360217D8F7Ab5e7c516566761Ea12Ce7F9D72';
const DELEGATEE = '0x1234567890abcdef1234567890abcdef12345678';

function ensTokenField() {
  return JSON.stringify({
    symbol: 'ENS',
    address: ENS_TOKEN,
    decimals: 18,
    isNative: false,
  });
}

describe('treasury-delegate', () => {
  it('encodes delegate() on the token contract', () => {
    const [action] = treasuryDelegate.encode(
      { token: ensTokenField(), delegatee: DELEGATEE },
      {},
    );
    expect(action.target.toLowerCase()).toBe(ENS_TOKEN.toLowerCase());
    expect(action.signature).toBe('delegate(address)');
  });

  it('round-trips for a known votes-token (ENS)', () => {
    assertRoundTrip(treasuryDelegate, {
      token: ensTokenField(),
      delegatee: DELEGATEE,
    });
  });

  it('does not claim delegate() on the Nouns token', () => {
    assertNoMatch(treasuryDelegate, [
      {
        target: NOUNS_ADDRESSES.token,
        value: '0',
        signature: 'delegate(address)',
        calldata: encodeAbiParameters(parseAbiParameters('address'), [
          DELEGATEE,
        ]),
      },
    ]);
  });
});
