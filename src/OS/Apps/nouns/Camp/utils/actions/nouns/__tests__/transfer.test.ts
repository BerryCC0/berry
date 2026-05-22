import { describe, it, expect } from 'vitest';
import { encodeAbiParameters, parseAbiParameters } from 'viem';
import { nounTransfer } from '../transfer';
import { NOUNS_ADDRESSES } from '@/app/lib/nouns';
import {
  assertNoMatch,
  assertRoundTrip,
} from '../../__tests__/roundTrip';

const RECIPIENT = '0x1234567890abcdef1234567890abcdef12345678';
const RANDOM_ADDR = '0x9999999999999999999999999999999999999999';

describe('noun-transfer', () => {
  it('encodes safeTransferFrom(treasury, recipient, nounId)', () => {
    const [action] = nounTransfer.encode(
      { recipient: RECIPIENT, nounId: '42' },
      {},
    );
    expect(action.target).toBe(NOUNS_ADDRESSES.token);
    expect(action.signature).toBe('safeTransferFrom(address,address,uint256)');
  });

  it('round-trips', () => {
    assertRoundTrip(nounTransfer, { recipient: RECIPIENT, nounId: '100' });
  });

  it('does not claim user-to-user safeTransferFrom (not a treasury proposal)', () => {
    assertNoMatch(nounTransfer, [
      {
        target: NOUNS_ADDRESSES.token,
        value: '0',
        signature: 'safeTransferFrom(address,address,uint256)',
        calldata: encodeAbiParameters(
          parseAbiParameters('address, address, uint256'),
          [RANDOM_ADDR, RECIPIENT, BigInt(1)],
        ),
      },
    ]);
  });
});
